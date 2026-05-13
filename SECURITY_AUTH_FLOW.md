# Auth Security Flow

## Data Model

`pending_registrations`

- `email`: primary key for one pending registration per address.
- `full_name`: staged display name.
- `password_hash`: bcrypt hash, never raw password.
- `otp_hash`: bcrypt hash of the 6-digit OTP.
- `expires_at`: OTP expiry; application issues 5-minute OTPs.
- `attempt_count`: failed OTP verification attempts; hard limit is 5.
- `resend_count`: OTP sends for the active pending record; hard limit is 5.
- `updated_at`: resend throttling anchor; minimum resend interval is 60 seconds.

`users`

- `password_hash`: bcrypt hash.
- `reset_token`: bcrypt hash of password reset OTP.
- `reset_token_expiry`: reset OTP expiry; application issues 5-minute OTPs.
- `reset_token_attempts`: failed reset OTP attempts; hard limit is 5.

## Security Flow

1. Client fetches `/api/auth/csrf` and sends `X-CSRF-TOKEN` for mutating requests.
2. reCAPTCHA v3 token is generated with an action name:
   - `login`
   - `register`
   - `forgot_password`
   - `admin_login`
3. API verifies reCAPTCHA v3 action and minimum score when `RECAPTCHA_SECRET_KEY` is configured.
4. Registration request validates payload with Zod, checks unique email, hashes password and OTP with bcrypt, stores only hashes, and sends email OTP.
5. Registration verification locks the pending row, checks expiry and attempt limit, compares OTP with bcrypt, deletes the pending row, and creates the user.
6. Password reset uses generic responses for unknown emails to reduce account enumeration.
7. Sensitive routes are protected by CSRF middleware and route-level rate limiting.

## Basic Penetration Test Cases

| ID | Target | Attack | Expected Result |
| --- | --- | --- | --- |
| PT-01 | `POST /api/auth/register/request-otp` | Missing `X-CSRF-TOKEN` | `403`, no DB mutation |
| PT-02 | `POST /api/auth/register/request-otp` | Invalid email / short password | `422`, Zod validation error |
| PT-03 | `POST /api/auth/register/request-otp` | SQL injection string in email | `422` or no match; parameterized query prevents injection |
| PT-04 | `POST /api/auth/register/request-otp` | Resend same email within 60 seconds | `429` |
| PT-05 | `POST /api/auth/register/request-otp` | More than 5 sends for active pending email | `429` |
| PT-06 | `POST /api/auth/register/verify` | Wrong OTP 5 times | Pending registration is deleted or blocked; final result `429` |
| PT-07 | `POST /api/auth/register/verify` | Correct OTP after expiry | `400`, pending registration deleted |
| PT-08 | `POST /api/auth/forgot-password` | Unknown email | Generic `success: true` response, no account enumeration |
| PT-09 | `POST /api/auth/reset-password` | Wrong OTP 5 times | Reset token cleared; final result `429` |
| PT-10 | `POST /api/auth/login` | Repeated bad password | Rate limit applies; reCAPTCHA required after failure threshold |
| PT-11 | `POST /api/admin/login` | reCAPTCHA token action mismatch | `400`, `captchaRequired: true` |
| PT-12 | Mutating auth endpoints | Cross-site form POST without CSRF header | `403` |

## Unit And Integration Test Suggestions

- Unit test Zod schema validation for login, registration, forgot password, reset password, profile update, and change password.
- Unit test OTP attempt transitions: first wrong OTP increments, fifth wrong OTP clears pending state.
- Integration test CSRF by calling mutating endpoints before and after fetching `/api/auth/csrf`.
- Integration test reCAPTCHA with a mocked `siteverify` response for action mismatch, low score, and success.
- Integration test password reset enumeration resistance by comparing known and unknown email responses.
