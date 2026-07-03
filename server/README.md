# NextHire Backend — Clean Architecture

TypeScript + Express backend for the NextHire job portal, built in Clean Architecture with classes, SOLID principles, and centralized error handling.

## Architecture

```
src/
├── domain/                    # Innermost layer — no framework imports
│   ├── entities/               # IUser, IOTPSession, IAppeal
│   ├── repositories/            # Repository interfaces (contracts)
│   └── services/                # External service interfaces (contracts)
│
├── use-cases/                  # Application business rules — one class per action
│   ├── UseCase.ts                # Abstract base class every use case extends
│   ├── auth/                    # RegisterUseCase, LoginUseCase, VerifyOTPUseCase,
│   │                             GoogleAuthUseCase, ForgotPasswordUseCase,
│   │                             ResetPasswordUseCase, SubmitAppealUseCase
│   ├── admin/                   # GetUsersUseCase, SetUserStatusUseCase,
│   │                             GetAppealsUseCase, ReviewAppealUseCase, AdminLoginUseCase
│   └── profile/                 # SetupProfileUseCase
│
├── infrastructure/             # Outermost layer — concrete implementations
│   ├── database/
│   │   ├── models/               # Mongoose schemas
│   │   └── connection.ts
│   ├── repositories/            # MongoUserRepository, MongoOTPRepository, MongoAppealRepository
│   ├── services/                # JWTService, EmailService, FirebaseAuthService,
│   │                             CloudinaryService, OTPGenerator
│   └── config/                  # cloudinary.ts, firebase.ts, mail.ts
│
├── interfaces/
│   ├── controllers/             # Thin — delegate to use cases
│   ├── middlewares/              # authMiddleware, adminMiddleware, errorMiddleware
│   └── routes/
│
├── shared/errors/
│   ├── error-codes.ts           # ErrorCode enum — single source of truth
│   └── AppError.ts               # The only error class the app throws
│
├── app.ts
└── server.ts
```

## SOLID in this codebase

| Principle | Where |
|---|---|
| **S**ingle Responsibility | Each use case does one thing. `OTPGenerator` only generates codes. `JWTService` only signs/verifies tokens. |
| **O**pen/Closed | New use cases (e.g. a future `DeleteAccountUseCase`) slot in without touching existing classes. |
| **L**iskov Substitution | Any `IUserRepository` implementation is swappable — `MongoUserRepository` could be replaced by a Postgres version with zero changes to use cases. |
| **I**nterface Segregation | `IEmailService`, `ITokenService`, `IUploadService` are separate, narrow contracts — no class is forced to implement methods it doesn't need. |
| **D**ependency Inversion | Use cases take interfaces in their constructors; controllers wire in the concrete `Mongo*`/`JWTService`/etc. instances. |

## OOP pillars, with real locations

- **Encapsulation** — `JWTService` hides `process.env.JWT_SECRET` and the `jsonwebtoken` library entirely behind `generate()`/`verify()`. Nothing else in the app touches the secret or the library directly.
- **Inheritance** — `AppError extends Error` (shared/errors/AppError.ts). Every use case `extends UseCase<TInput, TOutput>` (use-cases/UseCase.ts).
- **Polymorphism** — `MongoUserRepository`, any future `PostgresUserRepository`, etc. all implement `IUserRepository` and are interchangeable wherever that interface is expected.
- **Abstraction** — two forms, used deliberately for different things:
  - **Interfaces** (`IUserRepository`, `IEmailService`, ...) — pure contracts, zero implementation, compile-time only.
  - **Abstract class** (`UseCase<TInput, TOutput>` in `use-cases/UseCase.ts`) — a real runtime class that cannot be instantiated directly (`new UseCase()` is a compile error) and that every concrete use case must extend and implement `execute()` for. Unlike an interface, it also carries shared, already-implemented logic (`assertExists()`) that subclasses inherit for free.

## Why repositories exist alongside use cases

A use case decides **what** should happen and in what order (business rules). A repository decides **how** data is actually read or written (Mongoose queries, in this case). Use cases never import Mongoose or touch `UserModel` directly — they only call methods on an `IUserRepository`. This means:
- Use cases can be tested with a fake in-memory repository, no real database needed.
- Swapping databases means writing one new repository class — zero changes to business logic.
- A bug in "what should happen" and a bug in "how data is fetched" are never tangled in the same function.

## Error handling

Every error in the app is an `AppError` carrying:
- `status` — HTTP status code
- `code` — one of `ErrorCode` (e.g. `EMAIL_NOT_FOUND`, `OTP_MAX_ATTEMPTS`, `ACCOUNT_BANNED`)
- `message` — human-readable text
- `data` *(optional)* — extra payload (e.g. ban/suspend details for the frontend to render a redirect page)

The global `errorHandler` middleware catches these and returns a consistent shape:

```json
{ "success": false, "message": "...", "code": "EMAIL_NOT_FOUND", "data": null }
```

Anything that isn't an `AppError` (a real bug, a DB timeout, etc.) falls through to a generic `500 INTERNAL_ERROR` — this is intentional: only *expected* business errors get specific codes, so frontend code can safely switch on `code` without false positives.

## OTP session behavior (3-minute timer + reset)

- `OTP_SESSION_TTL_MS` in `domain/entities/otp.types.ts` is the single place the 3-minute window is defined.
- Every OTP send **or resend** calls `createOrReset(...)`, which deletes any prior session for that email+type and starts a fresh 3-minute window — there's no "extend," only a clean reset.
- Wrong-code attempts increment a counter; after `OTP_MAX_ATTEMPTS` (5), the session locks and a new OTP must be requested, even if time remains on the original window.
- The frontend resends a login OTP simply by calling `/auth/login` again, which naturally resets the session — no separate resend endpoint needed.

## API Endpoints

### `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Start registration → sends email_verify OTP |
| POST | `/login` | Validates password → sends login_verify OTP |
| POST | `/verify-otp` | Verifies any OTP type → returns JWT on success |
| POST | `/google` | Firebase Google sign-in/sign-up |
| POST | `/forgot-password` | Sends forgot_password OTP |
| POST | `/reset-password` | Sets new password after OTP verified |

### `/api/profile` (🔒 user JWT)
| Method | Path | Description |
|---|---|---|
| PUT | `/setup` | Onboarding profile setup, optional image upload |

### `/api/admin`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | — | Admin login → admin JWT |
| GET | `/users` | 🔒 admin | Paginated users list |
| PATCH | `/users/:userId/status` | 🔒 admin | Ban / suspend / activate |
| GET | `/appeals` | 🔒 admin | All appeals |
| PATCH | `/appeals/:appealId/review` | 🔒 admin | Approve/reject an appeal |
| POST | `/appeals/suspension` | — | User submits a suspension appeal |
| POST | `/appeals/ban` | — | User submits a ban appeal |
| GET | `/appeals/user/:userId` | — | A user's own appeal history |

## Setup

```bash
npm install
cp .env.example .env   # fill in your real values
npm run dev
```

## ⚠️ Security note on admin credentials

Admin login credentials are read from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` — never hardcoded in source. Set a strong, unique password before deploying.
