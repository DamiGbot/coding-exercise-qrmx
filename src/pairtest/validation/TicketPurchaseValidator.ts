import InvalidPurchaseException from '../lib/InvalidPurchaseException';
import TicketTypeRequest from '../lib/TicketTypeRequest';

/**
 * Validates ticket purchase requests against the cinema ticketing business rules.
 */

const MAX_TICKETS = 25;

export default class TicketPurchaseValidator {

  /**
   * Validates a ticket purchase request in full.
   *
   * @param accountId - the account making the purchase; must be greater than zero.
   * @param ticketTypeRequests - the ticket requests to validate; must not be null or empty.
   * @throws {InvalidPurchaseException} if any validation rule is violated.
   */
  validate(accountId: number | null | undefined, ticketTypeRequests: TicketTypeRequest[] | null | undefined): void {
    this.#validateAccountId(accountId);
    this.#validateRequestsArray(ticketTypeRequests);
    this.#validateTicketCounts(ticketTypeRequests as TicketTypeRequest[]);
  }

  /**
   * Validates that the account ID is non-null and greater than zero.
   */
  #validateAccountId(accountId: number | null | undefined): void {
    if (accountId == null || accountId <= 0) {
      const message = `Account ID must be greater than zero, got: ${accountId}`;
      console.warn(message);
      throw new InvalidPurchaseException(message);
    }
  }

  /**
   * Validates the request array is non-null, non-empty, and contains no null or zero-quantity entries.
   */
  #validateRequestsArray(ticketTypeRequests: TicketTypeRequest[] | null | undefined): void {
    if (ticketTypeRequests == null) {
      const message = 'Ticket requests must not be null';
      console.warn(message);
      throw new InvalidPurchaseException(message);
    }
    if (ticketTypeRequests.length === 0) {
      const message = 'At least one ticket request must be provided';
      console.warn(message);
      throw new InvalidPurchaseException(message);
    }
    for (const request of ticketTypeRequests) {
      if (request == null) {
        const message = 'Individual ticket requests must not be null';
        console.warn(message);
        throw new InvalidPurchaseException(message);
      }
      if (request.getNoOfTickets() <= 0) {
        const message = `Ticket quantity must be greater than zero, got: ${request.getNoOfTickets()}`;
        console.warn(message);
        throw new InvalidPurchaseException(message);
      }
    }
  }

  /**
   * Validates the adult, child, and infant counts against the cinema business rules.
   */
  #validateTicketCounts(ticketTypeRequests: TicketTypeRequest[]): void {
    let adultCount = 0;
    let childCount = 0;
    let infantCount = 0;

    for (const request of ticketTypeRequests) {
      switch (request.getTicketType()) {
        case 'ADULT':  adultCount  += request.getNoOfTickets(); break;
        case 'CHILD':  childCount  += request.getNoOfTickets(); break;
        case 'INFANT': infantCount += request.getNoOfTickets(); break;
      }
    }

    const totalTickets = adultCount + childCount + infantCount;
    if (totalTickets > MAX_TICKETS) {
      const message = `Total ticket count exceeds maximum of ${MAX_TICKETS}, got: ${totalTickets}`;
      console.warn(message);
      throw new InvalidPurchaseException(message);
    }

    if (childCount > 0 && adultCount === 0) {
      const message = 'Child tickets cannot be purchased without at least one Adult ticket';
      console.warn(message);
      throw new InvalidPurchaseException(message);
    }

    if (infantCount > 0 && adultCount === 0) {
      const message = 'Infant tickets cannot be purchased without at least one Adult ticket';
      console.warn(message);
      throw new InvalidPurchaseException(message);
    }

    if (infantCount > adultCount) {
      const message = `Number of infants (${infantCount}) cannot exceed number of adults (${adultCount})`;
      console.warn(message);
      throw new InvalidPurchaseException(message);
    }
  }
}