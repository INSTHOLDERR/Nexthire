import crypto from 'crypto';


export class OTPGenerator {
  generate(): string {
    return crypto.randomInt(100000, 999999).toString();
  }
}

export default new OTPGenerator();
