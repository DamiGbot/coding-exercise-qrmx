import { describe, it, beforeEach, expect, vi, type Mock } from 'vitest';
import TicketService from '../src/pairtest/TicketService';
import TicketTypeRequest from '../src/pairtest/lib/TicketTypeRequest';
import InvalidPurchaseException from '../src/pairtest/lib/InvalidPurchaseException';

describe('TicketService', () => {

  let paymentService: { makePayment: Mock };
  let reservationService: { reserveSeat: Mock };
  let validator: { validate: Mock };
  let ticketService: TicketService;

  beforeEach(() => {
    paymentService     = { makePayment: vi.fn() };
    reservationService = { reserveSeat: vi.fn() };
    validator          = { validate: vi.fn() };
    ticketService      = new TicketService(
      paymentService     as unknown as import('../src/thirdparty/paymentgateway/TicketPaymentService').default,
      reservationService as unknown as import('../src/thirdparty/seatbooking/SeatReservationService').default,
      validator          as unknown as import('../src/pairtest/validation/TicketPurchaseValidator').default,
    );
  });

  // --- Happy path tests ---

  it('should charge £50 and reserve 2 seats for 2 adult tickets', () => {
    ticketService.purchaseTickets(1, new TicketTypeRequest('ADULT', 2));

    expect(paymentService.makePayment).toHaveBeenCalledWith(1, 50);
    expect(reservationService.reserveSeat).toHaveBeenCalledWith(1, 2);
  });

  it('should charge £55 and reserve 3 seats for 1 adult and 2 child tickets', () => {
    ticketService.purchaseTickets(1,
      new TicketTypeRequest('ADULT', 1),
      new TicketTypeRequest('CHILD', 2));

    expect(paymentService.makePayment).toHaveBeenCalledWith(1, 55);
    expect(reservationService.reserveSeat).toHaveBeenCalledWith(1, 3);
  });

  it('should charge adults only and reserve no seats for infants', () => {
    ticketService.purchaseTickets(1,
      new TicketTypeRequest('ADULT', 2),
      new TicketTypeRequest('INFANT', 2));

    expect(paymentService.makePayment).toHaveBeenCalledWith(1, 50);
    expect(reservationService.reserveSeat).toHaveBeenCalledWith(1, 2);
  });

  it('should calculate correct totals when all three ticket types are purchased', () => {
    ticketService.purchaseTickets(1,
      new TicketTypeRequest('ADULT', 2),
      new TicketTypeRequest('CHILD', 1),
      new TicketTypeRequest('INFANT', 1));

    expect(paymentService.makePayment).toHaveBeenCalledWith(1, 65);
    expect(reservationService.reserveSeat).toHaveBeenCalledWith(1, 3);
  });

  it('should process a purchase at the maximum limit of 25 tickets', () => {
    ticketService.purchaseTickets(1,
      new TicketTypeRequest('ADULT', 15),
      new TicketTypeRequest('CHILD', 5),
      new TicketTypeRequest('INFANT', 5));

    expect(paymentService.makePayment).toHaveBeenCalledWith(1, 450);
    expect(reservationService.reserveSeat).toHaveBeenCalledWith(1, 20);
  });

  it('should sum duplicate ticket types before calculating payment and seats', () => {
    ticketService.purchaseTickets(1,
      new TicketTypeRequest('ADULT', 2),
      new TicketTypeRequest('ADULT', 3));

    expect(paymentService.makePayment).toHaveBeenCalledWith(1, 125);
    expect(reservationService.reserveSeat).toHaveBeenCalledWith(1, 5);
  });

  // --- Parameterised calculation tests ---

  it.each([
    // adults, children, infants, expectedPayment, expectedSeats
    [1, 0, 0,  25,  1],
    [3, 0, 0,  75,  3],
    [1, 1, 0,  40,  2],
    [2, 3, 0,  95,  5],
    [1, 0, 1,  25,  1],
    [3, 2, 3, 105,  5],
    [5, 5, 5, 200, 10],
  ])('should calculate correct payment and seat count: %i adults, %i children, %i infants → £%i, %i seats',
    (adults, children, infants, expectedPayment, expectedSeats) => {
      const requests = buildRequests(adults, children, infants);
      ticketService.purchaseTickets(1, ...requests);

      expect(paymentService.makePayment).toHaveBeenCalledWith(1, expectedPayment);
      expect(reservationService.reserveSeat).toHaveBeenCalledWith(1, expectedSeats);
    });

  // --- Validation delegation tests ---

  it('should not call external services when validation fails', () => {
    validator.validate.mockImplementation(() => {
      throw new InvalidPurchaseException('invalid');
    });

    expect(() => ticketService.purchaseTickets(0, new TicketTypeRequest('ADULT', 1)))
      .toThrow(InvalidPurchaseException);

    expect(paymentService.makePayment).not.toHaveBeenCalled();
    expect(reservationService.reserveSeat).not.toHaveBeenCalled();
  });

  it('should delegate validation to TicketPurchaseValidator before processing', () => {
    const request = new TicketTypeRequest('ADULT', 1);
    ticketService.purchaseTickets(1, request);

    expect(validator.validate).toHaveBeenCalledWith(1, [request]);
  });

});

// --- Helpers ---

function buildRequests(adults: number, children: number, infants: number): TicketTypeRequest[] {
  const requests: TicketTypeRequest[] = [];
  if (adults   > 0) requests.push(new TicketTypeRequest('ADULT',  adults));
  if (children > 0) requests.push(new TicketTypeRequest('CHILD',  children));
  if (infants  > 0) requests.push(new TicketTypeRequest('INFANT', infants));
  return requests;
}