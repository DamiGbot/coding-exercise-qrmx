# Technical Approach - Coding Assessment

> This document outlines my thinking and planning process before writing any implementation code.
> As a senior developer, I believe understanding the problem deeply, making intentional design decisions,
> and planning for quality upfront leads to cleaner, more maintainable solutions.

---

## 1. Understanding the Problem

Before writing any code, I read through the requirements carefully and asked myself the following questions:

- What does this service actually need to **do**?
- What are the **boundaries** - what can and cannot be changed?
- What does **invalid** look like, and where should those checks live?
- What are the **implicit** rules that aren't explicitly stated?

---

## 2. Analysing the Existing Codebase

The template project provides:

| Component                | Role                                                 | Modifiable?           |
| ------------------------ | ---------------------------------------------------- | --------------------- |
| `TicketService`          | Class I must implement                               | No (shape is fixed)   |
| `TicketTypeRequest`      | Immutable value object representing a ticket request | Must remain immutable |
| `TicketPaymentService`   | External provider - handles payment                  | No                    |
| `SeatReservationService` | External provider - handles seat reservation         | No                    |

My task is to provide the **implementation** of `TicketService`, acting as the orchestrator between the business rules and the two external services.

---

## 3. Identifying All Validation Rules

I broke down the business rules into explicit validation cases. These became the basis for my test plan.

### Explicit Rules (stated in requirements)

| Rule                                    | Validation                                      |
| --------------------------------------- | ----------------------------------------------- |
| Maximum 25 tickets per purchase         | Reject if total ticket count > 25               |
| Infants pay £0 and get no seat          | Exclude from payment and seat reservation       |
| Child tickets require at least 1 Adult  | Reject if child count > 0 and adult count == 0  |
| Infant tickets require at least 1 Adult | Reject if infant count > 0 and adult count == 0 |
| Account ID must be valid                | Reject if account ID <= 0                       |

### Implicit Rules (not explicitly stated, but logically required)

| Rule                                                         | Reasoning                                                                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ticketTypeRequests` must not be null                        | Null must be checked first - a null check and an empty-array check are two distinct code paths                                                               |
| `ticketTypeRequests` must not be zero-length                 | `purchaseTickets(accountId)` with no varargs produces a zero-length array (not null) - must be caught separately after the null check                        |
| No individual element within the array may be null           | `purchaseTickets(1, null, new TicketTypeRequest('ADULT', 2))` passes null and empty checks but will throw during iteration                                   |
| Ticket quantities per `TicketTypeRequest` cannot be zero     | A zero-quantity entry is rejected as invalid - not silently ignored - to prevent ambiguous downstream rule failures                                           |
| Ticket quantities per `TicketTypeRequest` cannot be negative | A negative ticket count has no business meaning                                                                                                              |
| At least 1 ticket must be requested across all entries       | Purchasing 0 tickets is not a valid transaction                                                                                                              |
| Infants cannot outnumber Adults                              | Each infant sits on an Adult's lap - 1 adult cannot hold 2 infants                                                                                           |

> **Note on the infant-to-adult ratio rule:** The requirement states "Infants will be sitting on an Adult's lap."
> This strongly implies a 1:1 relationship. I have chosen to enforce this as it reflects real-world
> safety and business logic. This is a decision I am comfortable defending and would raise with
> the business/product team if requirements were ambiguous in a real scenario.

---

## 4. Calculating Payment and Seats

### Payment Calculation

| Ticket Type | Price |
| ----------- | ----- |
| ADULT       | £25   |
| CHILD       | £15   |
| INFANT      | £0    |

`totalAmount = (adultCount x 25) + (childCount x 15)`

### Seat Reservation Calculation

Infants do **not** occupy a seat (they sit on an adult's lap).

`seatsToReserve = adultCount + childCount`

---

## 5. Design Decisions

### Single Responsibility

I separated validation logic into its own class (`TicketPurchaseValidator`) rather than embedding it in the service. This keeps the service clean, makes validation independently testable, and allows the rules to evolve without touching service orchestration logic.

### Fail Fast

All validation is performed **before** any call to external services. It would be wrong to take a payment and then fail on seat reservation, or vice versa. Invalid requests are rejected at the earliest possible point.

### Immutability of `TicketTypeRequest`

As required by the constraints, `TicketTypeRequest` is treated as an immutable object. I do not attempt to modify it, only read from it via `getTicketType()` and `getNoOfTickets()`.

### No Modification of Third-Party Packages

`TicketPaymentService` and `SeatReservationService` are treated as black boxes. I only call them - I do not modify or wrap them with additional logic.

### Dependency Injection

`TicketService` receives `TicketPaymentService`, `SeatReservationService`, and `TicketPurchaseValidator` via constructor injection. No DI framework is needed - plain constructor injection makes all three dependencies easily replaceable with Vitest mocks in tests, without any reflection or test-specific configuration. This is the simplest approach that achieves full testability.

### Encapsulation with Private Class Fields

All injected dependencies and internal state are stored as TypeScript `readonly` private class fields (`#paymentService`, `#reservationService`, `#validator`). The `#` prefix is enforced by the JavaScript runtime - the field is inaccessible from outside the class at runtime, not just at compile time. The `readonly` modifier adds a compile-time guarantee that the field cannot be reassigned after construction. Together they provide the strongest available encapsulation guarantee in TypeScript.

### Thread Safety

JavaScript is single-threaded, so concurrent mutation is not a concern. The class holds no mutable state - all computation is performed on local variables within `purchaseTickets`. This also makes the class safe to use as a singleton.

### Named Constants and Switch Statements

Ticket prices are declared as named module-level constants (`ADULT_PRICE = 25`, `CHILD_PRICE = 15`, `MAX_TICKETS = 25`) - never as inline literals scattered through the logic.

Type dispatch uses `switch` statements over the string ticket type values. This makes every branch explicit and visible, and adding a new ticket type to `TicketTypeRequest` requires a deliberate update at every switch site.

### Exception Strategy

Invalid requests throw an `InvalidPurchaseException` as provided by the template. Exception messages identify the violated rule and include the offending value where safe to do so (e.g. `"Account ID must be greater than zero, got: 0"`, `"Total ticket count exceeds maximum of 25, got: 30"`). This aids debugging and gives any consuming code a clear signal about why a request was rejected.

---

## 6. Test Strategy

As a senior developer, I treat tests as a first-class concern. My test plan covers:

### Test Infrastructure

- **Framework:** Vitest with `vi.fn()` for mocking external dependencies
- **Naming convention:** `should_expectedBehaviour_when_condition` style display names
- **Parameterised tests:** Calculation scenarios use `it.each` to cover multiple ticket combinations without duplicating test boilerplate

### Happy Path Tests

- Purchase of Adult tickets only
- Purchase of Adult + Child tickets
- Purchase of Adult + Infant tickets
- Purchase of all three ticket types together
- Maximum allowed 25 tickets

### Validation / Edge Case Tests

- Account ID of 0 - rejected
- Account ID of -1 - rejected
- Null `ticketTypeRequests` array - rejected (null-check fires before length-check)
- Zero-length array (calling `purchaseTickets(accountId)` with no varargs) - rejected
- Array containing a null element - rejected
- `TicketTypeRequest` with quantity 0 - rejected
- Negative ticket quantity - rejected
- Child tickets with no Adult - rejected
- Infant tickets with no Adult - rejected
- More infants than adults - rejected
- Total count exceeding 25 - rejected
- **Boundary value analysis at the 25-ticket limit:** 24 tickets (pass), 25 tickets (pass), 26 tickets (fail)

### Calculation Tests

- Correct total price calculated for various combinations (via `it.each`)
- Correct seat count calculated (infants excluded)
- `TicketPaymentService` called with correct amount
- `SeatReservationService` called with correct seat count
- Two `ADULT` entries of quantity 2 and quantity 3 - treated as 5 adults, total £125, 5 seats reserved (verifies duplicate type summing)

### Verification

I use Vitest mocks to verify that:

- External services are called the **correct number of times**
- External services are called with the **correct arguments**
- External services are **never called** when a request is invalid

---

## 7. Project Structure

```
src/
├── pairtest/
│   ├── lib/
│   │   ├── InvalidPurchaseException.ts
│   │   └── TicketTypeRequest.ts
│   ├── validation/
│   │   └── TicketPurchaseValidator.ts
│   └── TicketService.ts
│
└── thirdparty/
    ├── paymentgateway/
    │   └── TicketPaymentService.ts
    └── seatbooking/
        └── SeatReservationService.ts

test/
├── TicketService.test.ts
└── TicketPurchaseValidator.test.ts
```

The `validation` sub-directory separates the rule-enforcement concern from the orchestration concern. This means the validator can be tested entirely in isolation, its rules can grow in complexity without touching `TicketService`, and the directory structure communicates intent: anything inside `validation` is about deciding whether a request is legal, not about processing it.

---

## 8. Assumptions Made

1. **Infants cannot outnumber Adults** - one adult lap per infant.
2. **Zero-ticket requests are invalid** - a purchase must contain at least one ticket.
3. **Negative quantities are invalid** - no business meaning for a negative ticket.
4. **Duplicate ticket types in the request array** - if the same ticket type appears more than once, the counts are summed (e.g., two entries of `ADULT, 2` and `ADULT, 3` = 5 adults total).
5. **Zero-quantity `TicketTypeRequest` entries are invalid** - a `TicketTypeRequest` with a quantity of 0 is rejected outright rather than silently filtered out. Silently ignoring it could mask rule violations (e.g. `ADULT, 0` plus `CHILD, 2` would pass the adult-present check if the zero were ignored, then incorrectly reserve seats for the child).
6. **The external services are reliable** - as stated in the requirements, I do not add retry logic or defensive wrapping around `TicketPaymentService` or `SeatReservationService`.

---

## 9. What I Would Do Next (in a real team setting)

### Already mitigated in this implementation

- **Named constants** (`ADULT_PRICE`, `CHILD_PRICE`, `MAX_TICKETS`) are used instead of inline literals - this is the minimum step towards making the service adaptable without a full config externalisation conversation.
- **Explicit switch statements** over ticket type strings ensure that adding a new ticket type in future requires a deliberate update at every dispatch site.
- **Constructor injection** for all dependencies means the service is fully testable without a framework and the collaboration contracts are explicit.

### Requires team or stakeholder input before proceeding

- **Raise ambiguities** with the product owner before coding - particularly the infant:adult ratio rule and whether zero-quantity entries should be silently dropped or rejected.
- **Externalise configuration** - the 25-ticket limit and pricing could move to a configuration file or environment variables, making changes deployable without a code release. This is a team decision (config management, deployment pipeline, environment parity).
- **Agree on the `InvalidPurchaseException` message contract** so that messages are consistent, consumer-friendly, and safe to surface (no sensitive data leakage).
- **Logging framework choice** - in a production Node.js service, structured logging (e.g. Pino or Winston) would replace `console.warn`/`console.info`. The framework choice should align with the team's standard and observability stack.
- **Perform a code review** with a peer before submission.