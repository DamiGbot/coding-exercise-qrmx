export default class InvalidPurchaseException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPurchaseException';
  }
}