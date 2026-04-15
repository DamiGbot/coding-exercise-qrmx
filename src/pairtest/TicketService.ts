import TicketTypeRequest from './lib/TicketTypeRequest';
import TicketPaymentService from '../thirdparty/paymentgateway/TicketPaymentService';
import SeatReservationService from '../thirdparty/seatbooking/SeatReservationService';
import TicketPurchaseValidator from './validation/TicketPurchaseValidator';

/**
 * Implementation of TicketService that validates requests, calculates
 * payment and seat totals, then delegates to the external payment and reservation services.
 */

const ADULT_PRICE = 25;
const CHILD_PRICE = 15;

export default class TicketService {

  readonly #paymentService: TicketPaymentService;
  readonly #reservationService: SeatReservationService;
  readonly #validator: TicketPurchaseValidator;

  /**
   * Constructs a TicketService with its required dependencies.
   *
   * @param paymentService     - external service used to process payments.
   * @param reservationService - external service used to reserve seats.
   * @param validator          - enforces business rules before any processing occurs.
   */
  constructor(
    paymentService: TicketPaymentService,
    reservationService: SeatReservationService,
    validator: TicketPurchaseValidator,
  ) {
    this.#paymentService = paymentService;
    this.#reservationService = reservationService;
    this.#validator = validator;
  }

  /**
   * Processes a ticket purchase for the given account.
   *
   * Should only have private methods other than the one below.
   *
   * @param accountId - the purchasing account; must be greater than zero.
   * @param ticketTypeRequests - one or more ticket requests describing type and quantity.
   * @throws {InvalidPurchaseException} if the request violates any business rule.
   */
  purchaseTickets(accountId: number, ...ticketTypeRequests: TicketTypeRequest[]): void {
    try {
      this.#validator.validate(accountId, ticketTypeRequests);
    } catch (e) {
      console.warn(`Purchase rejected for account ${accountId}: ${(e as Error).message}`);
      throw e;
    }

    let adultCount = 0;
    let childCount = 0;

    for (const request of ticketTypeRequests) {
      switch (request.getTicketType()) {
        case 'ADULT': adultCount += request.getNoOfTickets(); break;
        case 'CHILD': childCount += request.getNoOfTickets(); break;
        // infants pay nothing and occupy no seat
      }
    }

    const totalAmount = (adultCount * ADULT_PRICE) + (childCount * CHILD_PRICE);
    const seatsToReserve = adultCount + childCount;

    this.#paymentService.makePayment(accountId, totalAmount);
    this.#reservationService.reserveSeat(accountId, seatsToReserve);

    console.info(`Purchase successful for account ${accountId}: charged £${totalAmount}, reserved ${seatsToReserve} seat(s)`);
  }
}