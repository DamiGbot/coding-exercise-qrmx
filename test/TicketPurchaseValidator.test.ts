import { describe, it, beforeEach, expect } from 'vitest';
import TicketPurchaseValidator from '../src/pairtest/validation/TicketPurchaseValidator';
import TicketTypeRequest from '../src/pairtest/lib/TicketTypeRequest';
import InvalidPurchaseException from '../src/pairtest/lib/InvalidPurchaseException';

describe('TicketPurchaseValidator', () => {

  let validator: TicketPurchaseValidator;

  beforeEach(() => {
    validator = new TicketPurchaseValidator();
  });

  // --- Account ID validation ---

  describe('account ID validation', () => {

    it('should reject purchase when account ID is null', () => {
      expect(() => validator.validate(null, [new TicketTypeRequest('ADULT', 1)]))
        .toThrow(InvalidPurchaseException);
      expect(() => validator.validate(null, [new TicketTypeRequest('ADULT', 1)]))
        .toThrowError('Account ID must be greater than zero');
    });

    it('should reject purchase when account ID is zero', () => {
      expect(() => validator.validate(0, [new TicketTypeRequest('ADULT', 1)]))
        .toThrow(InvalidPurchaseException);
      expect(() => validator.validate(0, [new TicketTypeRequest('ADULT', 1)]))
        .toThrowError('Account ID must be greater than zero');
    });

    it('should reject purchase when account ID is negative', () => {
      expect(() => validator.validate(-1, [new TicketTypeRequest('ADULT', 1)]))
        .toThrow(InvalidPurchaseException);
      expect(() => validator.validate(-1, [new TicketTypeRequest('ADULT', 1)]))
        .toThrowError('Account ID must be greater than zero');
    });

  });

  // --- Request array validation ---

  describe('request array validation', () => {

    it('should reject purchase when request array is null', () => {
      expect(() => validator.validate(1, null))
        .toThrow(InvalidPurchaseException);
      expect(() => validator.validate(1, null))
        .toThrowError('Ticket requests must not be null');
    });

    it('should reject purchase when request array is empty', () => {
      expect(() => validator.validate(1, []))
        .toThrow(InvalidPurchaseException);
      expect(() => validator.validate(1, []))
        .toThrowError('At least one ticket request must be provided');
    });

    it('should reject purchase when request array contains a null element', () => {
      expect(() => validator.validate(1, [null as unknown as TicketTypeRequest, new TicketTypeRequest('ADULT', 1)]))
        .toThrow(InvalidPurchaseException);
      expect(() => validator.validate(1, [null as unknown as TicketTypeRequest, new TicketTypeRequest('ADULT', 1)]))
        .toThrowError('Individual ticket requests must not be null');
    });

    it('should reject purchase when a ticket quantity is zero', () => {
      expect(() => validator.validate(1, [new TicketTypeRequest('ADULT', 0)]))
        .toThrow(InvalidPurchaseException);
      expect(() => validator.validate(1, [new TicketTypeRequest('ADULT', 0)]))
        .toThrowError('Ticket quantity must be greater than zero');
    });

    it('should reject purchase when a ticket quantity is negative', () => {
      expect(() => validator.validate(1, [new TicketTypeRequest('ADULT', -1)]))
        .toThrow(InvalidPurchaseException);
      expect(() => validator.validate(1, [new TicketTypeRequest('ADULT', -1)]))
        .toThrowError('Ticket quantity must be greater than zero');
    });

  });

  // --- Ticket count validation ---

  describe('ticket count validation', () => {

    it('should reject purchase when total ticket count exceeds 25', () => {
      expect(() => validator.validate(1, [new TicketTypeRequest('ADULT', 26)]))
        .toThrow(InvalidPurchaseException);
      expect(() => validator.validate(1, [new TicketTypeRequest('ADULT', 26)]))
        .toThrowError('Total ticket count exceeds maximum of 25');
    });

    it('should accept purchase when total ticket count is exactly 25', () => {
      expect(() => validator.validate(1, [new TicketTypeRequest('ADULT', 25)]))
        .not.toThrow();
    });

    it('should accept purchase when total ticket count is 24', () => {
      expect(() => validator.validate(1, [new TicketTypeRequest('ADULT', 24)]))
        .not.toThrow();
    });

    it('should reject purchase when child tickets are requested without an adult', () => {
      expect(() => validator.validate(1, [new TicketTypeRequest('CHILD', 2)]))
        .toThrow(InvalidPurchaseException);
      expect(() => validator.validate(1, [new TicketTypeRequest('CHILD', 2)]))
        .toThrowError('Child tickets cannot be purchased without at least one Adult ticket');
    });

    it('should reject purchase when infant tickets are requested without an adult', () => {
      expect(() => validator.validate(1, [new TicketTypeRequest('INFANT', 1)]))
        .toThrow(InvalidPurchaseException);
      expect(() => validator.validate(1, [new TicketTypeRequest('INFANT', 1)]))
        .toThrowError('Infant tickets cannot be purchased without at least one Adult ticket');
    });

    it('should reject purchase when infants outnumber adults', () => {
      expect(() => validator.validate(1, [
        new TicketTypeRequest('ADULT', 1),
        new TicketTypeRequest('INFANT', 2),
      ])).toThrow(InvalidPurchaseException);
      expect(() => validator.validate(1, [
        new TicketTypeRequest('ADULT', 1),
        new TicketTypeRequest('INFANT', 2),
      ])).toThrowError('Number of infants');
    });

  });

  // --- Happy path ---

  describe('happy path', () => {

    it('should accept a valid adult-only purchase request', () => {
      expect(() => validator.validate(1, [new TicketTypeRequest('ADULT', 3)]))
        .not.toThrow();
    });

    it('should accept a valid purchase with adult, child, and infant tickets', () => {
      expect(() => validator.validate(1, [
        new TicketTypeRequest('ADULT', 2),
        new TicketTypeRequest('CHILD', 1),
        new TicketTypeRequest('INFANT', 2),
      ])).not.toThrow();
    });

    it('should accept purchase when infant count equals adult count', () => {
      expect(() => validator.validate(1, [
        new TicketTypeRequest('ADULT', 3),
        new TicketTypeRequest('INFANT', 3),
      ])).not.toThrow();
    });

  });

});