export interface IOTP {
  _id: string;
  email: string;
  otp: string;

  type: "email_verify" | "forgot_password" | "login_verify";

  expiresAt: Date;
  used: boolean;

  pendingPassword?: string;
}
