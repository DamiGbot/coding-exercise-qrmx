/* eslint-disable */

export default class TicketPaymentService {
  makePayment(accountId: number, totalAmountToPay: number): void {
    if (!Number.isInteger(accountId)) {
      throw new TypeError('accountId must be an integer');
    }

    if (!Number.isInteger(totalAmountToPay)) {
      throw new TypeError('totalAmountToPay must be an integer');
    }
  }
}