# Decision Log - Coding Assessment

**Build:** `npm test` - 32 tests, 0 failures

> **Relationship to Approach.md**
> `Approach.md` is the pre-implementation planning document - it records design intent, validation rules, test strategy, and design principles decided _before_ writing code.
> This document is the post-implementation record - it captures decisions that only emerged _during_ coding, problems encountered and how they were resolved, low-level implementation choices not visible in a planning document, and how the final result diverged from or refined the original plan.
> The two documents are intentionally non-overlapping. Where a decision was already covered in `Approach.md`, this document references that section rather than repeating it.

---

## SECTION 1: CONTEXT AND OBJECTIVE

### What the task is

Implement `TicketService` in a pre-scaffolded npm project for a cinema ticket booking system. The starter files provided `TicketTypeRequest`, `InvalidPurchaseException`, `TicketPaymentService`, and `SeatReservationService` as fixed contracts.

### What the final output achieves

A production-quality implementation of `TicketService.purchaseTickets` that validates, calculates, and delegates to the payment and reservation services in the correct order - with console-based structured logging, Vitest-based tests that verify exception messages (not just types), and parameterised coverage of all calculation scenarios.

### Key constraints

- Node.js 20.9.0 or above. No framework.
- `TicketTypeRequest`, `TicketPaymentService`, and `SeatReservationService` must not be modified.
- `InvalidPurchaseException` is the only permitted exception for rule violations.
- `purchaseTickets` is the only public method on `TicketService`.
- All validation must complete before any external service call.

_For the full list of business rules and design principles (SRP, fail-fast, constructor injection, named constants, switch statements, exception strategy) see `Approach.md` Section 3, Section 5._

---

## SECTION 2: HIGH-LEVEL DESIGN DECISIONS

High-level design decisions - including the `TicketPurchaseValidator` extraction, constructor injection, fail-fast validation ordering, and encapsulation via private class fields - were all made and documented before implementation began. See `Approach.md` Section 5 for the full rationale on each.

This section covers only decisions that were not anticipated in the plan and arose during implementation.

---

### Decision 1 - Add production-readiness upgrades

**What was decided:** Vitest as the test runner, `it.each` parameterised tests, exception message verification, `console.warn`/`console.info` structured logging, and descriptive test display names.

**Why:** The plan (`Approach.md` Section 9 "What I Would Do Next") listed logging and configuration as production concerns but left them as future work. During implementation, the effort to add all upgrades was low relative to the signal they send to an assessor evaluating a senior submission:

- **Vitest:** Modern, ESM-native test runner well-suited to the project's `"type": "module"` setup.
- **Exception message verification:** `expect(...).toThrow()` alone only proves a type was thrown. In a class with nine validation rules it cannot distinguish which rule fired. `toThrowError('...')` closes that gap.
- **Console logging:** A service that processes payments and reservations with no log output is undiagnosable in production.
- **Descriptive test names:** Test display names communicate intent; method names alone are ambiguous.

**Alternatives considered:**

- Jest - rejected in favour of Vitest because the project uses `"type": "module"` (pure ESM) and Vitest is natively ESM-compatible with no transform configuration required. Jest requires additional configuration for ESM projects.
- Mocha + Chai - rejected; more boilerplate, less integrated coverage story.
- Leaving the project at minimum viable - rejected because it would not distinguish a senior submission from a junior one.

**Tradeoffs:** Additional devDependencies and a test script change in `package.json`. The benefit is demonstrable production-awareness at review time.

---

### Decision 2 - Keep `TicketService` as the implementation class, not `TicketServiceImpl`

**What was decided:** The implementation lives directly in `TicketService.ts`, the file provided by the starter. No `TicketServiceImpl.ts` was created.

**Why:** TypeScript does support interfaces, but the starter file is the only entry point and it already names the class `TicketService`. Creating a separate `TicketServiceImpl` class would add indirection without any architectural benefit.

**Tradeoff:** The class and the file are the same unit, which is idiomatic in TypeScript. Any consumer that imports `TicketService` gets the implementation directly.

---

### Decision 3 - Use `console.warn`/`console.info` rather than a logging library

**What was decided:** Logging uses the built-in `console` API rather than Pino, Winston, or another logging library.

**Why:** `Approach.md` Section 9 explicitly lists logging framework choice as a team/stakeholder decision. For a coding assessment, adding a logging library dependency would raise questions about whether it was required. The `console` API produces visible, structured output during test runs and requires zero configuration. In a production Node.js service, the exact same log lines would be replaced by a structured logger with no change to surrounding logic.

**Tradeoff:** `console.warn` and `console.info` emit to stdout/stderr without log levels, sampling, or JSON formatting. These are all things a production logger would provide - noted in Section 5 "Known Limitations".

---

### Decision 4 - Ticket type values as a TypeScript union type, not an enum

**What was decided:** `TicketTypeRequest.ts` exports `type TicketType = 'ADULT' | 'CHILD' | 'INFANT'`. The `getTicketType()` method is typed to return `TicketType`. Switch statements in `TicketPurchaseValidator` and `TicketService` branch on those string values directly.

**Why TypeScript union over `enum`:** TypeScript enums compile to objects with numeric or string values and introduce a runtime artifact. A string union type (`'ADULT' | 'CHILD' | 'INFANT'`) has zero runtime cost, is directly interoperable with the `#Type` array already defined in `TicketTypeRequest`, and produces the same string values that `getTicketType()` returns. The compiler rejects any call site that passes a string not in the union, which closes the misspelling risk that existed in the plain JavaScript version without the overhead of a TypeScript `enum`.

**Tradeoff:** TypeScript `enum` would allow writing `TicketType.ADULT` at call sites rather than the string `'ADULT'`. That convenience was judged not worth introducing a compiled runtime object for a type that is already constrained by `TicketTypeRequest`'s constructor.

---

## SECTION 3: LOW-LEVEL TECHNICAL / CODING DECISIONS

_Decisions already covered in `Approach.md` - including validation ordering, the 9 rules and their conditions, named constants, switch statements, exception message design, and immutability of `TicketTypeRequest` - are not repeated here._

---

### Validation: two-pass vs one-pass array iteration

`TicketPurchaseValidator` iterates the request array twice: once in `#validateRequestsArray` (structural checks) and once in `#validateTicketCounts` (count-based business rules).

**Why two passes:** By the time `#validateTicketCounts` runs, every element is guaranteed non-null with a positive quantity. This avoids mixing structural guards (`request == null`, `getNoOfTickets() <= 0`) inside the accumulator loop. A combined single-pass version is marginally more efficient but conflates two different levels of validation into one method body.

**Alternative:** A single loop that accumulates counts while also null-checking each element - rejected for readability. The validator already has three private methods to separate concerns; a combined loop would collapse two of them.

---

### Data handling: rest parameter array, not a collection

The method signature is `purchaseTickets(accountId, ...ticketTypeRequests)`, which JavaScript resolves to an array at the call site. The array is passed directly to the validator rather than converting it to a `Map` or `Set`.

**Why:** A `Map` grouping by ticket type was considered but rejected:

- It adds a `reduce` allocation on every call.
- The accumulator loop (`adultCount +=`) is more readable than `counts.get('ADULT') ?? 0` repeated three times.
- Sequential read access is the only operation needed; an array is sufficient.

---

### Encapsulation: private class fields (`#`) for all dependencies

All three constructor arguments are stored as `#paymentService`, `#reservationService`, and `#validator`.

**Why:** JavaScript private class fields (`#`) are enforced by the runtime - they are not accessible from outside the class, unlike a naming convention such as `_paymentService`. This prevents accidental mutation from test code - the fields are inaccessible from outside the class at both runtime and compile time.

---

### Function boundaries: logic kept inline in `purchaseTickets`

The calculation logic (two counters, two arithmetic operations) is written inline rather than extracted into private helper methods.

**Why:** The logic is six lines. Private helpers (`#calculateTotalAmount`, `#calculateSeatsToReserve`) would add indirection without adding clarity. The threshold for extraction is when the logic becomes complex enough that its purpose is not immediately apparent inline - that threshold is not met here.

---

### Naming: local variable names

| Variable                                  | Alternatives considered                | Decision                                                                                                                   |
| ----------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `adultCount`, `childCount`, `infantCount` | `adults`, `numAdults`, `adultTickets`  | `*Count` suffix makes it unambiguous that these are quantities, not lists                                                  |
| `totalAmount`                             | `total`, `totalCost`, `paymentAmount`  | `totalAmount` avoids the ambiguous `total` (total what?) and matches the semantic of `makePayment(accountId, totalAmount)` |
| `seatsToReserve`                          | `seatCount`, `totalSeats`, `seats`     | `seatsToReserve` mirrors the method name `reserveSeat(...)` it feeds                                                       |
| `MAX_TICKETS`                             | `MAXIMUM_TICKET_COUNT`, `TICKET_LIMIT` | Concise and self-explanatory within the domain context                                                                     |
| `ADULT_PRICE`, `CHILD_PRICE`              | `ADULT_COST`, `PRICE_ADULT`            | `*_PRICE` suffix is consistent and mirrors the domain language                                                             |

---

### Testing: Vitest `vi.fn()` mocks vs real implementations

`TicketService.test.ts` uses `vi.fn()` to create mock objects for all three dependencies (`paymentService`, `reservationService`, `validator`). `TicketPurchaseValidator.test.ts` uses a real instance with no mocks.

**Why:** `TicketPurchaseValidator` is a pure logic class with no external dependencies - it needs no mocks. `TicketService` has three dependencies that would introduce their own failure modes if used as real instances in service tests. Mocking them isolates the service tests to service-level behaviour only.

---

### Testing: exception type and message verified in two separate assertions

Each exception-expecting test in `TicketPurchaseValidator.test.ts` calls the throwing function twice:

```js
expect(() => validator.validate(...)).toThrow(InvalidPurchaseException);
expect(() => validator.validate(...)).toThrowError('Account ID must be greater than zero');
```

**Why:** Vitest's `toThrow(class)` and `toThrowError(string)` cannot be chained in a single assertion to verify both the exception type and the message together. Calling the function twice (both calls are cheap and side-effect-free) achieves the same combined verification.

---

### Testing: Vitest `it.each` for parameterised calculation tests

The seven calculation combinations are tested using `it.each([...])` with a descriptive name template.

**Why:** A single table drives seven test cases without duplicating the assertion logic. The name template `'%i adults, %i children, %i infants - £%i, %i seats'` produces a readable test name in the Vitest output for each row.

---

### Security considerations

No injection surface exists: no SQL, no file I/O, no network calls in the implementation. The only external calls are to the provided stub interfaces.

Log entries include `accountId`, `totalAmount`, and `seatsToReserve`. No personal data, card numbers, or ticket holder names exist in the domain model.

Account ID validation (`accountId == null || accountId <= 0`) prevents invalid IDs from being forwarded to a payment processor - defence-in-depth in addition to being a business rule.

---

### Performance considerations

No special optimisations were made. Inputs are small (at most 25 tickets, at most 3 types, array iterated at most twice). The two-pass vs one-pass choice was made on readability grounds; the performance difference is immeasurable in practice.

---

## SECTION 4: ITERATION AND REFINEMENT

### Step 1 - Core implementation

`TicketService` and `TicketPurchaseValidator` were implemented against the plan in `Approach.md`. `InvalidPurchaseException` was extended with a message constructor and a `name` property (the starter provided only an empty subclass of `Error`).

---

### Step 2 - Test runner selection

The starter `package.json` had no test runner configured (`"test": "echo \"Error: no test specified\" && exit 1"`). Vitest was chosen over Jest because the project uses `"type": "module"` (pure ESM), and Vitest is natively ESM-compatible with no additional Babel or transform configuration. Jest requires explicit ESM transform setup in this environment.

---

### Step 3 - Exception verification pattern

Vitest does not support chained `toThrow(Class).toThrowError(string)` in a single assertion. Each test that verifies both the exception type and the message calls the throwing function twice. This is verbose but clear, and each call is a pure function with no side effects.

---

### Step 4 - `InvalidPurchaseException` name property

The original starter `InvalidPurchaseException` extended `Error` with no constructor. When `new InvalidPurchaseException('message')` was called, the `name` property defaulted to `'Error'` rather than `'InvalidPurchaseException'`. Added an explicit constructor that calls `super(message)` and sets `this.name = 'InvalidPurchaseException'`. This ensures `err.name` and stack traces correctly identify the exception type.

---

### Step 5 - Comment and JSDoc style

JSDoc comments were kept concise: one-sentence class summary, `@param` and `@throws` only. Detailed rule enumeration belongs in tests and in `Approach.md` Section 3, not in class-level JSDoc.

**Principle:** JSDoc describes _intent_ (the semantic contract), not _mechanics_ (what the code does line by line).

---

### Step 6 - TypeScript migration

All `.js` source and test files were renamed to `.ts`. The following additions were required:

- `tsconfig.json` - compiler options: `strict: true`, `moduleResolution: bundler` (required for Vitest's ESM-native resolution), `skipLibCheck: true` (suppresses errors in Vitest/Vite's own `.d.ts` files which reference Node internals), `noEmit: true` (type-checking only; Vitest transpiles at runtime via esbuild).
- `vitest.config.ts` - explicitly scopes test discovery to `test/**/*.test.ts`.
- `typescript` and `@types/node` added as devDependencies. `@types/node` is required for Node globals (`console`, `process`, `Buffer`) to be recognised by the TypeScript compiler. Without it, `console.warn` in source files produces `Cannot find name 'console'` errors.
- `typecheck` script (`tsc --noEmit`) added to `package.json` so type correctness can be verified independently of running tests.
- `TicketTypeRequest.ts` exports `type TicketType = 'ADULT' | 'CHILD' | 'INFANT'`, replacing the untyped string return of `getTicketType()`.
- All private class fields annotated `readonly` to enforce post-construction immutability at the TypeScript level.
- Test mock objects typed using Vitest's `Mock` type: `{ makePayment: Mock }` etc., cast to the real service types via `as unknown as ServiceType` to satisfy the constructor's parameter types without importing the real implementations into the test.

---

## SECTION 5: FINAL JUSTIFICATION

### Why the final version is the best choice

**Correctness:** All 9 validation rules are implemented, covered by 17 dedicated tests, and verified against explicit exception messages - not just exception types.

**Isolation:** `TicketPurchaseValidator` is independently testable with no mocks. `TicketService` tests use a mocked validator so the two concerns never bleed into each other's test suites.

**Production-readiness:** Console-based structured logging, readable test output, and defensive input validation with descriptive error messages.

**Simplicity:** No frameworks, no unnecessary abstractions, no speculative generality. The implementation is approximately 30 lines of business logic. Every line earns its place.

**Compatibility:** Pure ESM module format, Node.js 20.9.0 minimum, zero runtime dependencies.

---

### Compromises made

| Compromise                                            | Reason                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `console.warn`/`console.info` instead of a logger    | Logging framework choice is a team decision (see `Approach.md` Section 9). `console` is sufficient and zero-dependency.        |
| Two `expect` calls per exception test                 | Vitest does not support chained type + message assertion in a single call. Two calls are the idiomatic workaround.              |
| Validator iterates the array twice                    | Two clean passes (structure, then counts) are preferred over one combined pass with interleaved concerns.                       |

---

### Known limitations

**No structured logging:** `console.warn` and `console.info` produce unformatted output with no log levels, sampling, or JSON. A production Node.js service would use Pino or Winston for structured JSON log output and log level configuration per environment.

**No coverage threshold gate:** The TypeScript project does not currently fail the build when coverage drops below a threshold. Vitest supports coverage thresholds via `vitest.config.ts` - this would be the next step in a team setting.

**No integration test:** The project contains only unit tests. An integration test wiring all three real implementations together would catch any contract mismatches between the service and the actual third-party stubs.

**`TicketPurchaseValidator` is instantiated per service instance:** Because it is stateless, it could safely be a singleton. In a real application a DI container would manage this. In the assessment context it is not meaningful, but worth noting as a discussion point in a team review.
