/**
 * Immutable Object.
 */

export type TicketType = 'ADULT' | 'CHILD' | 'INFANT';

export default class TicketTypeRequest {
  readonly #type: TicketType;
  readonly #noOfTickets: number;
  readonly #Type: readonly TicketType[] = ['ADULT', 'CHILD', 'INFANT'];

  constructor(type: TicketType, noOfTickets: number) {
    if (!this.#Type.includes(type)) {
      throw new TypeError(`type must be ${this.#Type.slice(0, -1).join(', ')}, or ${this.#Type.slice(-1)}`);
    }

    if (!Number.isInteger(noOfTickets)) {
      throw new TypeError('noOfTickets must be an integer');
    }

    this.#type = type;
    this.#noOfTickets = noOfTickets;
  }

  getNoOfTickets(): number {
    return this.#noOfTickets;
  }

  getTicketType(): TicketType {
    return this.#type;
  }
}