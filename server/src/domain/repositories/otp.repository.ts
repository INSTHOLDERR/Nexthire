import { IOTP } from "../entities/otp.types";

export interface IOTPRepository {
  create(
    email: string,
    otp: string,
    type: IOTP["type"]
  ): Promise<IOTP>;

  createPendingRegistration(
    email: string,
    otp: string,
    plaintextPassword: string
  ): Promise<IOTP>;

  findValid(
    email: string,
    otp: string,
    type: IOTP["type"]
  ): Promise<IOTP | null>;

  findPendingRegistration(
    email: string
  ): Promise<IOTP | null>;

  markUsed(id: string): Promise<void>;
}