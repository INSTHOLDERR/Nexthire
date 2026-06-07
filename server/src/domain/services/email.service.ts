export interface SuspensionEmailData {
  reason?: string;
  suspendedAt: Date;
  suspendedUntil: Date;
}

export interface BanEmailData {
  reason?: string;
  bannedAt: Date;
}

export interface AppealMessageEmailData {
  userName: string | null;
  message: string;
  appealType: string;
  appealStatus?: string;
}

export interface IEmailService {
  sendOTP(
    email: string,
    otp: string,
    type: string
  ): Promise<void>;

  sendSuspension(
    email: string,
    data: SuspensionEmailData
  ): Promise<void>;

  sendBan(
    email: string,
    data: BanEmailData
  ): Promise<void>;

  sendAppealMessage(
    email: string,
    data: AppealMessageEmailData
  ): Promise<void>;
}