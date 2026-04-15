# Coding Assessment

An implementation of a cinema ticket booking service in TypeScript. The service validates purchase requests, calculates the correct payment amount and seat count, and delegates to third-party payment and reservation services.

---

## Prerequisites

- Node.js 20.9.0 or above
- npm 9 or above

Verify your setup:

```bash
node --version
npm --version
```

---

## Install dependencies

```bash
npm install
```

---

## Run tests

```bash
npm test
```

Runs all 32 unit tests across two test files:

- `TicketService.test.ts` - verifies payment amounts, seat counts, and delegation behaviour
- `TicketPurchaseValidator.test.ts` - verifies all 9 validation rules in isolation

---

## Type checking

```bash
npm run typecheck
```

Runs the TypeScript compiler with `--noEmit` to verify all types across `src/` and `test/` with no output files produced. Expected output: no errors.

---

## Run tests with coverage report

```bash
npm run test:coverage
```

This runs all tests and generates a V8 instruction coverage report. Expected output:

```
Test Files  2 passed (2)
     Tests  32 passed (32)
```

---

## Project structure

```
src/
├── pairtest/
│   ├── lib/
│   │   ├── InvalidPurchaseException.ts  # Custom exception for rule violations
│   │   └── TicketTypeRequest.ts         # Immutable ticket request value object (do not modify)
│   ├── validation/
│   │   └── TicketPurchaseValidator.ts   # All business rule validation
│   └── TicketService.ts                 # Main service implementation
│
└── thirdparty/                          # Provided third-party stubs (do not modify)
    ├── paymentgateway/
    │   └── TicketPaymentService.ts      # Payment service stub
    └── seatbooking/
        └── SeatReservationService.ts    # Seat reservation service stub

test/
├── TicketService.test.ts
└── TicketPurchaseValidator.test.ts

tsconfig.json                            # TypeScript compiler configuration
vitest.config.ts                         # Vitest test runner configuration
```

---

## Business rules

| Rule                                  | Detail                                                                |
| ------------------------------------- | --------------------------------------------------------------------- |
| Maximum 25 tickets per purchase       | Total across all ticket types                                         |
| Adult tickets: £25 each               | Charged and allocated a seat                                          |
| Child tickets: £15 each               | Charged and allocated a seat; require at least one Adult              |
| Infant tickets: £0                    | No charge, no seat; sit on an Adult's lap; require at least one Adult |
| Infants cannot outnumber Adults       | One infant per adult lap                                              |
| Account ID must be greater than zero  | Null or non-positive IDs are rejected                                 |
| At least one ticket must be requested | Empty or null request arrays are rejected                             |

---

## Further reading

| Document                         | Purpose                                                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Approach.md](Approach.md)       | Pre-implementation planning: design decisions, validation rules, test strategy, assumptions, and what would be done next in a real team setting                   |
| [DecisionLog.md](DecisionLog.md) | Post-implementation record: problems encountered during coding, how they were resolved, and low-level implementation choices not visible in the planning document |