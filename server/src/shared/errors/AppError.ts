import { ErrorCode } from './error-codes';
import { IUser } from '../../domain/entities/user.types';

/**
 * The only error class the application layer throws. Always carries an
 * HTTP status and a machine-readable code, optionally extra `data`
 * (e.g. ban/suspend details the frontend needs to render a redirect page).
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code: ErrorCode = ErrorCode.VALIDATION_ERROR, data?: unknown) {
    return new AppError(400, message, code, data);
  }

  static unauthorized(message: string, code: ErrorCode = ErrorCode.UNAUTHORIZED, data?: unknown) {
    return new AppError(401, message, code, data);
  }

  static forbidden(message: string, code: ErrorCode, data?: unknown) {
    return new AppError(403, message, code, data);
  }

  static notFound(message: string, code: ErrorCode = ErrorCode.NOT_FOUND) {
    return new AppError(404, message, code);
  }

  static conflict(message: string, code: ErrorCode, data?: unknown) {
    return new AppError(409, message, code, data);
  }

  static tooManyRequests(message: string, code: ErrorCode, data?: unknown) {
    return new AppError(429, message, code, data);
  }

  static internal(message = 'Internal server error') {
    return new AppError(500, message, ErrorCode.INTERNAL_ERROR);
  }

  /**
   * Always shapes ban/suspend payloads the same way: `userId` as a plain
   * string, never the raw Mongoose document. The frontend's appeal pages
   * (BannedPage, SuspendedPage) read `pageState.userId` directly — passing
   * the raw IUser object here (which has `_id`, not `userId`) silently
   * breaks that lookup and produces "Session error" when submitting an
   * appeal, since userId ends up undefined.
   */
  static bannedAccount(user: IUser) {
    return new AppError(403, 'This account has been banned.', ErrorCode.ACCOUNT_BANNED, {
      userId: String(user._id),
      email: user.email,
      banReason: user.banReason,
      bannedAt: user.bannedAt,
    });
  }

  static suspendedAccount(user: IUser) {
    return new AppError(403, 'This account has been suspended.', ErrorCode.ACCOUNT_SUSPENDED, {
      userId: String(user._id),
      email: user.email,
      suspensionReason: user.suspensionReason,
      suspendedAt: user.suspendedAt,
      suspendedUntil: user.suspendedUntil,
    });
  }
}
