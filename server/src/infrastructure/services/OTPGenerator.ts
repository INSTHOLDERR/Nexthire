import crypto from 'crypto';

/**
 * Generates 6-digit numeric OTP codes. Pulled out as its own class — single
 * responsibility — instead of calling crypto.randomInt inline in every use
 * case, and trivially mockable for tests.
 */
export class OTPGenerator {
  generate(): string {
    return crypto.randomInt(100000, 999999).toString();
  }
}

export default new OTPGenerator();
