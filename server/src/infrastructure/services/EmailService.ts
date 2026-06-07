
import {
  IEmailService,
  SuspensionEmailData,
  BanEmailData,
  AppealMessageEmailData,
} from '../../domain/services/email.service';
import { transporter } from '../config/mail';



export class EmailService implements IEmailService {
  private from = `"NextHire" <${process.env.EMAIL_USER}>`;

  async sendOTP(email: string, otp: string, type: string): Promise<void> {
    const isVerify = type === 'email_verify';
    const isLogin  = type === 'login_verify';
    const subject  = isVerify
      ? 'Verify your NextHire email'
      : isLogin
      ? 'Your NextHire login code'
      : 'Reset your NextHire password';

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
        <div style="margin-bottom:24px;">
          <span style="font-size:18px;font-weight:700;color:#0f172a;">NextHire</span>
        </div>
        <h2 style="color:#0f172a;margin-bottom:8px;font-size:18px;font-weight:600;">${isVerify ? 'Verify your email' : isLogin ? 'Login verification code' : 'Password reset code'}</h2>
        <p style="color:#64748b;font-size:14px;margin-bottom:24px;">Use the code below. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:28px;text-align:center;letter-spacing:14px;font-size:34px;font-weight:700;color:#0f172a;">${otp}</div>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;text-align:center;">Do not share this code with anyone.</p>
      </div>
    `;
    await transporter.sendMail({ from: this.from, to: email, subject, html });
  }

  async sendSuspension(email: string, { reason, suspendedAt, suspendedUntil }: SuspensionEmailData): Promise<void> {
    const fmt = (d: Date) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
        <div style="margin-bottom:24px;"><span style="font-size:18px;font-weight:700;color:#0f172a;">NextHire</span></div>
        <div style="display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;font-weight:600;padding:4px 12px;border-radius:100px;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.5px;">Account Suspended</div>
        <h2 style="color:#0f172a;margin-bottom:8px;font-size:20px;font-weight:700;">Your account has been suspended</h2>
        <p style="color:#64748b;font-size:14px;margin-bottom:24px;">Your NextHire account has been temporarily suspended by our moderation team.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:20px;">
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="color:#94a3b8;padding:10px 0;">Suspended on</td><td style="color:#0f172a;font-weight:500;text-align:right;padding:10px 0;">${fmt(suspendedAt)}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="color:#94a3b8;padding:10px 0;">Active until</td><td style="color:#d97706;font-weight:600;text-align:right;padding:10px 0;">${fmt(suspendedUntil)}</td></tr>
            <tr><td colspan="2" style="padding-top:12px;"><p style="color:#94a3b8;font-size:12px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.5px;">Reason</p><p style="color:#0f172a;margin:0;font-size:14px;">${reason || 'Violation of community guidelines'}</p></td></tr>
          </table>
        </div>
        <p style="color:#64748b;font-size:13px;line-height:1.6;">If you believe this is a mistake, you can submit an appeal by signing in to your account during your suspension period.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">— The NextHire Team</p>
      </div>
    `;
    await transporter.sendMail({ from: this.from, to: email, subject: 'Your NextHire account has been suspended', html });
  }

  async sendBan(email: string, { reason, bannedAt }: BanEmailData): Promise<void> {
    const fmt = (d: Date) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
        <div style="margin-bottom:24px;"><span style="font-size:18px;font-weight:700;color:#0f172a;">NextHire</span></div>
        <div style="display:inline-block;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:600;padding:4px 12px;border-radius:100px;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.5px;">Permanently Banned</div>
        <h2 style="color:#0f172a;margin-bottom:8px;font-size:20px;font-weight:700;">Your account has been permanently banned</h2>
        <p style="color:#64748b;font-size:14px;margin-bottom:24px;">Your NextHire account has been permanently removed for violating our Terms of Service.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:20px;">
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="color:#94a3b8;padding:10px 0;">Banned on</td><td style="color:#0f172a;font-weight:500;text-align:right;padding:10px 0;">${fmt(bannedAt)}</td></tr>
            <tr><td colspan="2" style="padding-top:12px;"><p style="color:#94a3b8;font-size:12px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.5px;">Reason</p><p style="color:#0f172a;margin:0;font-size:14px;">${reason || 'Severe violation of community guidelines'}</p></td></tr>
          </table>
        </div>
        <p style="color:#64748b;font-size:13px;line-height:1.6;">If you believe this is an error, you may contact our admin team at <a href="mailto:nexthireadmin@gmail.com" style="color:#0f172a;font-weight:600;">nexthireadmin@gmail.com</a></p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">— The NextHire Team</p>
      </div>
    `;
    await transporter.sendMail({ from: this.from, to: email, subject: 'Your NextHire account has been permanently banned', html });
  }

  async sendAppealMessage(email: string, { userName, message, appealType }: AppealMessageEmailData): Promise<void> {
    const typeLabel = appealType === 'ban' ? 'Ban Appeal' : 'Suspension Appeal';
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
        <div style="margin-bottom:24px;"><span style="font-size:18px;font-weight:700;color:#0f172a;">NextHire</span><span style="font-size:14px;color:#94a3b8;margin-left:8px;">Admin Team</span></div>
        <div style="display:inline-block;background:#f1f5f9;color:#475569;font-size:12px;font-weight:600;padding:4px 12px;border-radius:100px;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.5px;">${typeLabel}</div>
        <h2 style="color:#0f172a;margin-bottom:8px;font-size:18px;font-weight:600;">Message from the NextHire team</h2>
        <p style="color:#64748b;font-size:14px;margin-bottom:20px;">Hi ${userName || 'there'}, the admin team has sent you the following message regarding your appeal:</p>
        <div style="background:#f8fafc;border-left:4px solid #0f172a;border-radius:0 12px 12px 0;padding:20px;margin-bottom:24px;"><p style="color:#0f172a;font-size:14px;line-height:1.7;margin:0;white-space:pre-line;">${message}</p></div>
        <p style="color:#94a3b8;font-size:12px;margin-top:16px;">— The NextHire Team</p>
      </div>
    `;
    await transporter.sendMail({
      from: this.from,
      to: email,
      subject: `NextHire: Message about your ${typeLabel}`,
      html,
    });
  }
}

// Named exports for backward compatibility
const emailService = new EmailService();
export const sendOTPEmail          = emailService.sendOTP.bind(emailService);
export const sendSuspensionEmail   = emailService.sendSuspension.bind(emailService);
export const sendBanEmail          = emailService.sendBan.bind(emailService);
export const sendAppealMessageEmail = emailService.sendAppealMessage.bind(emailService);
export default emailService;
