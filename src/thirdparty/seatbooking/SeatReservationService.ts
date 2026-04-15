/* eslint-disable */

export default class SeatReservationService {
  reserveSeat(accountId: number, totalSeatsToAllocate: number): void {
    if (!Number.isInteger(accountId)) {
      throw new TypeError('accountId must be an integer');
    }

    if (!Number.isInteger(totalSeatsToAllocate)) {
      throw new TypeError('totalSeatsToAllocate must be an integer');
    }
  }
}