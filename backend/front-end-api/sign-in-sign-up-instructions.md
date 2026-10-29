# Sign-in & Sign-up (Clerk · Google / Apple) — Frontend Guide

How the React frontend (`frontend/`, Vite + React 19 + React Router 7) signs users in
with **Google** or **Apple** through Clerk and connects them to their Trellis account
on the backend.

---

## 1. How it works (read this first)

There are **two accounts** for every user, and the frontend's job is to connect them:

| Account | Lives in | Created by |
| ------- | -------- | ---------- |
| **Clerk identity** (Google / Apple login, session, email) | Clerk | Clerk's `<SignIn />` / `<SignUp />` components |
| **Trellis account** (role + profile: parent, teacher, doctor) | Our PostgreSQL DB | `POST /api/v1/auth/sign-up` |

The backend **never** sees a password and never talks to Google or Apple. Clerk does the
OAuth; the backend only verifies Clerk's session token and stores the role/profile.

```text
User clicks "Continue with Google / Apple"   (Clerk component)
        │
        ▼
Clerk OAuth  ──►  redirect back to  /auth/continue   (our page)
        │
        ▼
POST /api/v1/auth/sign-in   (with Clerk token)
        │
        ├── 200  → account exists  → go to the dashboard for user.role
        │
        └── 404  ACCOUNT_NOT_REGISTERED
                 → go to /onboarding (pick role + details)
                         │
                         ▼
                 POST /api/v1/auth/sign-up  { role, ... }
                         │
                         └── 201 → go to the dashboard for user.role
```

> **Learners (children) do not sign up here.** Only `PARENT`, `TEACHER` and `DOCTOR`
> can create an account with Google/Apple. Learner accounts are created by their parent
> (separate feature).

---

## 2. Setup

### 2.1 Install

```bash
cd frontend
npm install @clerk/react
```

### 2.2 Environment (`frontend/.env`)

```env
# Clerk Dashboard → API keys → Publishable key (the pk_test_... one, NEVER the secret key)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx

# Backend base URL
VITE_API_URL=http://localhost:5000/api/v1
```

> The backend only accepts tokens coming from origins listed in its `CORS_ORIGINS`
> (default `http://localhost:5173`, the Vite dev server). If the frontend runs on another
> port or domain, ask the backend team to add it — otherwise every call returns `401`.

### 2.3 Wrap the app with `ClerkProvider` (`src/main.jsx`)

```jsx
import { ClerkProvider } from "@clerk/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./app/App"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
```

Google and Apple are already enabled in the Clerk app, so Clerk's components show both
buttons automatically. Nothing to configure in code.

---

## 3. API reference

Base URL: `VITE_API_URL` (e.g. `http://localhost:5000/api/v1`)

Every request below **must** send the Clerk session token:

```http
Authorization: Bearer <token from useAuth().getToken()>
Content-Type: application/json
```

### Response envelope (all endpoints)

```jsonc
// success
{ "data": { ... } }

// error
{ "error": { "code": "CONFLICT", "message": "Human readable text", "details": null } }
```

Always branch on `error.code`, not on `message` (messages may change).

### The `AuthUser` object (returned by every endpoint here)

```jsonc
{
  "userId": "0b6c3c4e-…",           // Trellis user id (UUID) — use this in other API calls
  "role": "PARENT",                 // "PARENT" | "TEACHER" | "DOCTOR" (| "LEARNER")
  "createdAt": "2026-10-29T10:00:00.000Z",
  "profile": {                      // shape depends on profile.type
    "type": "PARENT",
    "email": "mom@gmail.com",
    "isEmailVerified": true,
    "mfaEnabled": false
  }
}
```

`profile` variants:

```jsonc
{ "type": "PARENT",  "email": "…", "isEmailVerified": true, "mfaEnabled": false }
{ "type": "TEACHER", "email": "…", "organization": "…|null", "school": "…|null", "subject": "…|null" }
{ "type": "DOCTOR",  "email": "…", "organization": "…|null", "licenseNumber": "…", "clinic": "…|null", "specialty": "…|null" }
```

---

### 3.1 `POST /auth/sign-in`

Call it right after Clerk finishes Google/Apple login **and** on every app load when the
user is signed in to Clerk. It tells you whether the person already has a Trellis account
and what their role is.

**Body:** none

| Status | `error.code` | Meaning | Frontend action |
| ------ | ------------ | ------- | --------------- |
| `200` | – | Account exists. `data` is an `AuthUser`. | Save user, go to their dashboard |
| `404` | `ACCOUNT_NOT_REGISTERED` | Signed in to Clerk, but never finished sign-up | Go to `/onboarding` |
| `401` | `UNAUTHORIZED` | Missing/expired token | Send to `/sign-in` |
| `429` | `TOO_MANY_REQUESTS` | Rate limited | Show "try again later" |

---

### 3.2 `POST /auth/sign-up`

Creates the Trellis account for the signed-in Clerk user. **Do not send the email** — the
backend reads it from the Google/Apple account through Clerk.

**Body** (pick one, by role):

```jsonc
// Parent
{ "role": "PARENT" }

// Teacher (all optional except role)
{ "role": "TEACHER", "organization": "…", "school": "…", "subject": "…" }

// Doctor (licenseNumber required, 3–100 chars)
{ "role": "DOCTOR", "licenseNumber": "EG-12345", "organization": "…", "clinic": "…", "specialty": "…" }
```

Rules: optional text fields are trimmed, 1–200 chars when present (omit them instead of
sending `""`). `role: "LEARNER"` is rejected.

| Status | `error.code` | Meaning | Frontend action |
| ------ | ------------ | ------- | --------------- |
| `201` | – | Account created. `data` is an `AuthUser`. | Save user, go to their dashboard |
| `400` | `VALIDATION_ERROR` | Bad body. `details` = `[{ location, path, message }]` | Show `message` under the field named `path` |
| `409` | `CONFLICT` | Already registered / email already used / license number taken | See note below |
| `422` | `UNPROCESSABLE` | Google/Apple account shared no email | Ask user to sign in with another account |
| `401` | `UNAUTHORIZED` | Missing/expired token | Send to `/sign-in` |
| `429` | `TOO_MANY_REQUESTS` | Max 20 sign-up attempts / 15 min per IP | Show "try again later" |

**409 handling:** if `message` says the account is already registered, just call
`POST /auth/sign-in` and continue. Otherwise show the message (email or license number
already in use).

---

### 3.3 `GET /account/me`

Same `AuthUser` and same errors as `/auth/sign-in` (including `404 ACCOUNT_NOT_REGISTERED`).
Use whichever reads better in your code; `/auth/sign-in` is the one to call right after login.

---

## 4. Implementation

Suggested files (match your `src/app` + `src/shared` layout):

```text
src/
├── shared/api/client.js          # fetch wrapper that adds the Clerk token
├── shared/api/auth.api.js        # signIn(), signUp()
├── app/auth/SignInPage.jsx       # /sign-in   (Clerk component)
├── app/auth/SignUpPage.jsx       # /sign-up   (Clerk component)
├── app/auth/AuthContinuePage.jsx # /auth/continue  (decides: dashboard or onboarding)
├── app/auth/OnboardingPage.jsx   # /onboarding     (role form → POST /auth/sign-up)
└── app/auth/RequireAccount.jsx   # guard for pages that need a Trellis account
```

### 4.1 API client — `src/shared/api/client.js`

```js
const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message ?? `Request failed (${status})`)
    this.status = status
    this.code = body?.error?.code ?? "UNKNOWN"
    this.details = body?.error?.details ?? null
  }
}

/** `getToken` comes from Clerk's useAuth(). */
export async function apiFetch(getToken, path, { method = "GET", body } = {}) {
  const token = await getToken()

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, json)
  return json.data
}
```

> Always call `getToken()` **per request**. Clerk tokens are short-lived (~60 s) and
> `getToken()` refreshes them for you. Never store the token in `localStorage`.

### 4.2 Auth API — `src/shared/api/auth.api.js`

```js
import { useAuth } from "@clerk/react"
import { useMemo } from "react"
import { apiFetch } from "./client"

export function useAuthApi() {
  const { getToken } = useAuth()

  return useMemo(
    () => ({
      signIn: () => apiFetch(getToken, "/auth/sign-in", { method: "POST" }),
      signUp: (payload) => apiFetch(getToken, "/auth/sign-up", { method: "POST", body: payload }),
    }),
    [getToken],
  )
}
```

### 4.3 Clerk pages — `/sign-in` and `/sign-up`

Both pages send the user to `/auth/continue` when Clerk is done. Whether they clicked
"sign in" or "sign up" on the Clerk side does not matter — `/auth/continue` asks the
backend and decides.

```jsx
// src/app/auth/SignInPage.jsx
import { SignIn } from "@clerk/react"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/auth/continue"
        signUpForceRedirectUrl="/auth/continue"
      />
    </div>
  )
}
```

```jsx
// src/app/auth/SignUpPage.jsx
import { SignUp } from "@clerk/react"

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/auth/continue"
        signInForceRedirectUrl="/auth/continue"
      />
    </div>
  )
}
```

Routes (`src/app/App.jsx`) — note the `/*` so Clerk's internal steps (e.g. SSO callback,
verification) work:

```jsx
import { Route, Routes } from "react-router-dom"
import AuthContinuePage from "./auth/AuthContinuePage"
import OnboardingPage from "./auth/OnboardingPage"
import RequireAccount from "./auth/RequireAccount"
import SignInPage from "./auth/SignInPage"
import SignUpPage from "./auth/SignUpPage"

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route path="/auth/continue" element={<AuthContinuePage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      <Route element={<RequireAccount />}>
        <Route path="/parent/*" element={<div>Parent dashboard</div>} />
        <Route path="/teacher/*" element={<div>Teacher dashboard</div>} />
        <Route path="/doctor/*" element={<div>Doctor dashboard</div>} />
      </Route>
    </Routes>
  )
}
```

Role → home page helper (put it in `src/shared/auth/home-for-role.js`):

```js
export const homeForRole = (role) =>
  ({ PARENT: "/parent", TEACHER: "/teacher", DOCTOR: "/doctor" })[role] ?? "/"
```

### 4.4 `/auth/continue` — decide where to go

```jsx
// src/app/auth/AuthContinuePage.jsx
import { useAuth } from "@clerk/react"
import { useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useAuthApi } from "../../shared/api/auth.api"
import { homeForRole } from "../../shared/auth/home-for-role"

export default function AuthContinuePage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { signIn } = useAuthApi()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    signIn()
      .then((user) => navigate(homeForRole(user.role), { replace: true }))
      .catch((err) => {
        if (err.code === "ACCOUNT_NOT_REGISTERED") navigate("/onboarding", { replace: true })
        else setError(err.message)
      })
  }, [isLoaded, isSignedIn, signIn, navigate])

  if (isLoaded && !isSignedIn) return <Navigate to="/sign-in" replace />
  if (error) return <p role="alert">{error}</p>
  return <p>Signing you in…</p>
}
```

### 4.5 `/onboarding` — create the Trellis account

```jsx
// src/app/auth/OnboardingPage.jsx
import { useAuth, useUser } from "@clerk/react"
import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useAuthApi } from "../../shared/api/auth.api"
import { homeForRole } from "../../shared/auth/home-for-role"

const FIELDS = {
  PARENT: [],
  TEACHER: ["organization", "school", "subject"],
  DOCTOR: ["licenseNumber", "organization", "clinic", "specialty"],
}

export default function OnboardingPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { signUp, signIn } = useAuthApi()
  const navigate = useNavigate()

  const [role, setRole] = useState("PARENT")
  const [values, setValues] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (isLoaded && !isSignedIn) return <Navigate to="/sign-in" replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFieldErrors({})
    setFormError(null)

    // Send only the fields for this role, and drop empty strings.
    const payload = { role }
    for (const field of FIELDS[role]) {
      const value = values[field]?.trim()
      if (value) payload[field] = value
    }

    try {
      const created = await signUp(payload)
      navigate(homeForRole(created.role), { replace: true })
    } catch (err) {
      if (err.code === "VALIDATION_ERROR") {
        setFieldErrors(Object.fromEntries(err.details.map((d) => [d.path, d.message])))
      } else if (err.code === "CONFLICT" && /already registered/i.test(err.message)) {
        const existing = await signIn()
        navigate(homeForRole(existing.role), { replace: true })
      } else {
        setFormError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 p-6">
      <h1>Welcome{user?.firstName ? `, ${user.firstName}` : ""}! Who are you?</h1>
      <p>Signed in as {user?.primaryEmailAddress?.emailAddress}</p>

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="PARENT">Parent</option>
        <option value="TEACHER">Teacher</option>
        <option value="DOCTOR">Doctor</option>
      </select>

      {FIELDS[role].map((field) => (
        <label key={field} className="block">
          {field}
          {field === "licenseNumber" && " *"}
          <input
            value={values[field] ?? ""}
            onChange={(e) => setValues({ ...values, [field]: e.target.value })}
            required={field === "licenseNumber"}
          />
          {fieldErrors[field] && <span role="alert">{fieldErrors[field]}</span>}
        </label>
      ))}

      {formError && <p role="alert">{formError}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Creating account…" : "Continue"}
      </button>
    </form>
  )
}
```

> The project already has `react-hook-form` + `zod` — feel free to rebuild this form with
> them. Mirror the backend rules: `licenseNumber` 3–100 chars (doctor only), other text
> fields 1–200 chars, all optional.

### 4.6 Guard pages that need an account — `RequireAccount.jsx`

```jsx
// src/app/auth/RequireAccount.jsx
import { useAuth } from "@clerk/react"
import { createContext, useContext, useEffect, useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useAuthApi } from "../../shared/api/auth.api"

const CurrentUserContext = createContext(null)
export const useCurrentUser = () => useContext(CurrentUserContext)

export default function RequireAccount() {
  const { isLoaded, isSignedIn } = useAuth()
  const { signIn } = useAuthApi()
  const [state, setState] = useState({ status: "loading", user: null })

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    signIn()
      .then((user) => setState({ status: "ready", user }))
      .catch((err) =>
        setState({ status: err.code === "ACCOUNT_NOT_REGISTERED" ? "unregistered" : "error", user: null }),
      )
  }, [isLoaded, isSignedIn, signIn])

  if (isLoaded && !isSignedIn) return <Navigate to="/sign-in" replace />
  if (state.status === "unregistered") return <Navigate to="/onboarding" replace />
  if (state.status === "error") return <p role="alert">Could not load your account.</p>
  if (state.status === "loading") return <p>Loading…</p>

  return (
    <CurrentUserContext.Provider value={state.user}>
      <Outlet />
    </CurrentUserContext.Provider>
  )
}
```

Inside any protected page: `const user = useCurrentUser()` → `user.role`, `user.profile`.

### 4.7 Header controls (sign-in button / avatar)

```jsx
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/react"

export function AuthControls() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  )
}
```

`<UserButton />` includes **Sign out**. After sign-out Clerk goes to `afterSignOutUrl` (`/`).

---

## 5. Custom Google / Apple buttons (optional)

If design needs your own buttons instead of Clerk's `<SignIn />` card, Clerk supports a
"custom flow" using `useSignIn()` with the strategies `oauth_google` and `oauth_apple`,
plus an SSO-callback route. This API changed in recent `@clerk/react` versions, so follow
the current official guide for the exact code rather than copying older snippets:
<https://clerk.com/docs/guides/development/custom-flows/authentication/oauth-connections>

Whatever you build, the **end of the flow must land on `/auth/continue`** — everything in
sections 4.4–4.6 stays the same.

---

## 6. Calling other protected endpoints

Every `/api/v1/account/*` and `/api/v1/admin/*` endpoint uses the same pattern:

```js
const { getToken } = useAuth()
const data = await apiFetch(getToken, "/account/me")
```

No cookies, no manual refresh, no storage — `getToken()` handles it.

---

## 7. Checklist / common mistakes

- [ ] `VITE_CLERK_PUBLISHABLE_KEY` is the **publishable** key (`pk_…`). The secret key (`sk_…`) must never be in the frontend.
- [ ] Every API call sends `Authorization: Bearer <await getToken()>`.
- [ ] Clerk routes are declared with `/*` (`/sign-in/*`, `/sign-up/*`).
- [ ] Both Clerk components redirect to `/auth/continue`.
- [ ] `404 ACCOUNT_NOT_REGISTERED` → `/onboarding`, never an error screen.
- [ ] Sign-up body never contains `email` — the backend takes it from Google/Apple.
- [ ] Frontend origin is in the backend's `CORS_ORIGINS`, otherwise every call is `401`.
- [ ] Apple can hide the real email (`…@privaterelay.appleid.com`); that is a valid email — treat it normally.

## 8. Quick test with curl

Get a token in the browser console while signed in:

```js
await window.Clerk.session.getToken()
```

```bash
TOKEN="paste-token-here"
curl -X POST http://localhost:5000/api/v1/auth/sign-in -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:5000/api/v1/auth/sign-up -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"role":"PARENT"}'
```

> Tokens live about 60 seconds, so run curl right after copying one. The backend checks the
> token's `azp` claim (the page origin that created it), so a token copied from a page on an
> origin not in `CORS_ORIGINS` is rejected even from curl.
