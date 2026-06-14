---
title: "NSDL: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of NSDL (MoF / SEBI-regulated depository) reveals a hardcoded AES key in the Angular bundle of the Insta Demat KYC flow, plain-text authentication tokens rendered into e-voting HTML, and weak image CAPTCHA across multiple NSDL e-services endpoints."
publishDate: 2026-06-14
tags: ["security", "responsible-disclosure", "india-gov", "finance", "depository", "securities"]
draft: false
---

# NSDL: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exact API endpoints (beyond the publicly visible URL paths), hardcoded key values, or step-by-step reproduction instructions are included. The hardcoded AES key value is referenced by *pattern* (UUID-format string), not by value. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | National Securities Depository Limited (NSDL) — multiple e-services |
| **Ministry/Body** | Ministry of Finance (MoF) / SEBI-regulated |
| **Data Category** | PAN, demat account IDs, BO (beneficial owner) identity, KYC, nominee details, e-voting credentials |
| **Sensitivity** | 🔴 High |
| **Platform** | Web (nsdl.co.in PHP, eservices.nsdl.com Java/JSP, Insta Demat Angular SPA) |
| **Analysis Date** | 2026-06-14 |
| **Critical Findings** | 1 |
| **High Findings** | 4 |
| **Medium Findings** | 3 |
| **Low Findings** | 2 |

## Summary

This analysis examined the client-side architecture of **NSDL** — India's first and largest securities depository, holding demat accounts for tens of millions of investors and providing e-voting, eKYC, and CAS (Consolidated Account Statement) services. Three distinct surfaces were examined:

- **`nsdl.co.in`** — corporate / informational site, PHP backend, hosts demat-account-opening form
- **`eservices.nsdl.com`** — Java/JSP backend, hosts e-voting, IDeAS, eKYC, Insta Demat KYC Nomination
- **Insta Demat KYC Nomination** — Angular SPA at `/instademat-kyc-nomination/`, ~1.6 MB main bundle

The Angular bundle for Insta Demat KYC Nomination contains a **hardcoded AES key** (UUID-format string) and an AES key identifier (`nvme`), used as part of a hybrid RSA+AES request-encryption scheme. The e-voting login page renders a **plaintext authentication token** ("NSDL Digital Authentication \<timestamp\>") into HTML as a hidden form field — the token is part of the OTP-generation POST payload. CAPTCHA across the properties is legacy image-based (`securimage`, `securimage_show.php`, `CaptchaImage`) with no reCAPTCHA / Turnstile / hCaptcha anywhere.

The analysis identified **1 critical**, **4 high**, **3 medium**, and **2 low** severity findings.

## Risk Factors

- **Hardcoded AES key** baked into a 1.6 MB Angular bundle shipped to every browser visiting the Insta Demat KYC flow — key extractable in seconds by anyone who opens DevTools
- Plaintext "NSDL Digital Authentication" token with millisecond timestamp rendered into e-voting login HTML — visible in every page source
- RSA+AES hybrid encryption pattern is correctly structured (RSA-wrapped AES key), but the static AES key constant suggests a fallback path that bypasses the per-session RSA exchange
- Legacy image CAPTCHA (`securimage`, ASP.NET text captcha) across all NSDL properties — bypassable with commodity OCR
- Multiple sub-properties on different stacks (`nsdl.co.in` PHP, `eservices.nsdl.com` Java/JSP, Angular SPA) — fragmentation increases attack surface
- `eservices.nsdl.com` CSP `frame-ancestors` explicitly whitelists a private-bank domain (`netportal.hdfcbank.com`) — third-party embedding increases supply-chain risk
- `Set-Cookie` headers on `eservices.nsdl.com` do not visibly set `HttpOnly` or `Secure` flags
- Missing `X-Content-Type-Options: nosniff` on `eservices.nsdl.com`
- No `Permissions-Policy` / `Feature-Policy` header on either domain

## Impact Scenarios

### Scenario: AES Key Extracted From Angular Bundle

The Insta Demat KYC Nomination Angular application uses a hybrid encryption scheme: requests are AES-encrypted, the AES key is wrapped under an RSA public key (typically fetched from the server), and the encrypted payload + encrypted AES key are sent together. This is the correct pattern. **However**, the bundle also defines a hardcoded AES key constant (UUID-format) and an `AES_KEY_ID = "nvme"` identifier, both shipped to every browser. If this constant is used as a fallback when the RSA exchange fails, or as a per-endpoint encryption key for some flows, then the RSA wrapping provides no confidentiality — anyone with the bundle (i.e., everyone) can decrypt the "encrypted" request payloads offline.

Decompiling an Angular production bundle is trivial: download `main.<hash>.js`, beautify, and grep for `AES_KEY`. The 1.6 MB file is downloaded in a single request and cached by the browser. This is the same architectural anti-pattern seen in PM-Kisan, Pension Seva, and U-WIN — except here it sits inside a SEBI-regulated depository that handles securities transactions worth crores of rupees daily.

### Scenario: E-Voting Authentication Token Leaked

The e-voting login page at `eservices.nsdl.com/SecureWeb/evoting/evotinglogin.jsp` renders an HTML hidden field:

```html
<input type="hidden" name="text" value="NSDL Digital Authentication <unix-ms-timestamp>">
```

This token is included as part of the FormData sent to the OTP-generation endpoint (`/SecureWeb/otpGenerationForEvoting.do`). Because the token is in the page source, anyone can extract it without authenticating. If the server uses this token as a request-signature or anti-replay nonce, the protection is nullified — the "secret" is handed to every visitor. If the token is purely an opaque session identifier, then exposing it in HTML (rather than as an HttpOnly cookie) makes it trivially stealable via any XSS on the page.

### Scenario: HDFC Bank Frame-Embedding Supply Chain

The CSP `frame-ancestors` directive on `eservices.nsdl.com` explicitly permits framing from `https://netportal.hdfcbank.com/`. This means HDFC Bank's net-banking portal can embed NSDL e-services inside an iframe. If the HDFC net-banking portal is ever compromised — through XSS, DNS spoofing, or credential leak — the attacker gains code-execution context inside the NSDL frame, including the ability to manipulate the e-voting login flow, intercept OTPs entered in the frame, and submit forged votes for institutional investors who rely on HDFC as their Depository Participant.

### Scenario: OTP Bruteforce with Weak CAPTCHA

The e-voting OTP flow accepts a 6-digit OTP and a 6-character image CAPTCHA. The OTP button re-enables after a 60-second client-side delay (`butOTP.value='Please wait 60 secs'`) — there is no evidence of server-side rate limiting, IP-based throttling, or exponential backoff. The CAPTCHA is generated server-side (`securimage_show.php`) but is a legacy PHP image CAPTCHA that is bypassable with off-the-shelf OCR libraries at >95% accuracy. With no reCAPTCHA / Turnstile, an attacker with a modest botnet can attempt OTP brute-force at scale, limited only by the server's tolerance for failed attempts.

## Findings Overview

| Severity | Category | Detail |
|----------|----------|--------|
| 🔴 CRITICAL | Hardcoded AES Key in Client Bundle | Insta Demat KYC Angular bundle contains a hardcoded UUID-format AES key + key ID constant |
| 🟠 HIGH | Plaintext Auth Token in HTML | E-voting login renders "NSDL Digital Authentication \<timestamp\>" as hidden form field |
| 🟠 HIGH | Weak CAPTCHA Across Properties | Legacy `securimage` / ASP.NET text CAPTCHA; no reCAPTCHA / Turnstile / hCaptcha anywhere |
| 🟠 HIGH | Third-Party Frame-Ancestors Whitelist | CSP `frame-ancestors` whitelists `netportal.hdfcbank.com` — supply-chain embedding risk |
| 🟠 HIGH | Cookie Security Flags Missing | `eservices.nsdl.com` cookies lack visible `HttpOnly` / `Secure` flags |
| 🟡 MEDIUM | Fragmented Stack | PHP + JSP + Angular on three subdomains — fragmented security posture |
| 🟡 MEDIUM | Missing Security Headers | No `X-Content-Type-Options: nosniff`, no `Permissions-Policy` on `eservices.nsdl.com` |
| 🟡 MEDIUM | 60-Second Client-Side OTP Cooldown | Client-side throttle only; no evidence of server-side rate limiting |
| 🔵 LOW | Obsolete Client Library Bundle | jQuery + jQuery UI + virtual keyboard on e-voting page — large attack surface for XSS sinks |
| 🔵 LOW | JavaScript Code Drift | Both `js/jquery.min.js` and `js/jquery.js` are referenced on the e-voting page — duplicate / drift |

## Why This Matters

NSDL sits at the heart of India's capital-market infrastructure:

- **3 crore+ demat accounts** with cumulative assets in hundreds of lakh crore rupees
- **PAN-seeded identity** for every investor
- **e-Voting** used by listed companies for shareholder resolutions — the integrity of corporate governance
- **CAS (Consolidated Account Statement)** — single source of truth for retail portfolio holdings
- **eKYC** — identity verification reused across mutual funds, insurance, and broking

When the cryptographic layer protecting these flows is **shipped to the client**, the effective security collapses to the transport layer (HTTPS) and the server-side rate limiter. For a SEBI-regulated depository, this is below the regulatory bar: SEBI's Cybersecurity & Cyber Resilience Framework (CSCRF, 2024) explicitly requires depositories to maintain server-side cryptographic controls and to avoid client-side key disclosure.

This analysis continues the series on Indian government / quasi-government portals that ship cryptographic primitives to the client. See prior analyses of [Aadhaar/UIDAI](./aadhaar-uidai-security-analysis.md), [PM-Kisan](./pmkisan-security-analysis.md), and [Pension Seva](./pension-seva-security-analysis.md). The pattern recurs because Angular's build pipeline bundles constants into the SPA, and teams often hardcode "dev" keys that never get migrated to server-provided values.

## Responsible Disclosure Timeline

| Date | Event |
|------|-------|
| 2026-06-14 | Blog analysis published with redacted details |
| 2026-06-14 | CERT-In disclosure initiated (V1–V6 format) for hardcoded AES key |
| 2026-06-14 | SEBI CSCRF compliance escalation for depository cybersecurity framework |
| ~2026-09-12 | 90-day responsible disclosure deadline |

## Recommendations

### Immediate (0–7 days)

1. **Rotate the hardcoded AES key** in the Insta Demat KYC Angular bundle. Treat the existing UUID key value as compromised.
2. **Remove the static AES key constant** from the bundle entirely. All AES keys must be server-provided (per-session) and wrapped under a fresh RSA key pair.
3. **Stop rendering the e-voting authentication token as an HTML hidden field.** Move the token to an HttpOnly, Secure, SameSite=Strict cookie. If the token must travel in form data, sign it server-side with a per-request nonce.
4. **Audit the `frame-ancestors` whitelist** for `netportal.hdfcbank.com`. Confirm HDFC Bank still requires direct frame embedding; if not, restrict to same-origin.

### Short-Term (1–4 weeks)

5. **Replace all legacy image / text CAPTCHAs** with Google reCAPTCHA v3 or Cloudflare Turnstile on login, OTP-generation, and OTP-validation endpoints across all NSDL properties.
6. **Add server-side rate limiting** for OTP generation (5 per phone per hour, 20 per IP per hour, exponential backoff after 3 failed OTPs).
7. **Set `HttpOnly`, `Secure`, `SameSite=Strict`** on all session cookies on `eservices.nsdl.com`.
8. **Add missing security headers** on `eservices.nsdl.com`: `X-Content-Type-Options: nosniff`, `Permissions-Policy: geolocation=(), microphone=(), camera=()`, `Referrer-Policy: strict-origin-when-cross-origin`.
9. **Remove the duplicate jQuery references** (`jquery.min.js` and `jquery.js` on the same page) on the e-voting page.

### Structural (1–3 months)

10. **Adopt a uniform client-side crypto policy** across all NSDL properties — server-provided RSA public keys, per-session AES keys, no client-side constants.
11. **Migrate the JSP e-voting platform** to a modern framework (e.g., Spring Boot + React) with CSP nonces, subresource integrity, and a curated crypto module.
12. **Independent security audit** by a CERT-In empanelled auditor against SEBI CSCRF, with findings published in summary form.
13. **Publish a security.txt** (`/.well-known/security.txt`) on all NSDL domains with a vulnerability-disclosure contact.

## Cross-References

- [Aadhaar (UIDAI): Security Architecture Analysis](./aadhaar-uidai-security-analysis.md) — foundational identity layer
- [PM-Kisan: Security Architecture Analysis](./pmkisan-security-analysis.md) — same client-side AES anti-pattern in DBT
- [Pension Seva: Security Architecture Analysis](./pension-seva-security-analysis.md) — same client-side crypto anti-pattern in pensions
- Series index: [Indian Government Portal Security Audit](./) (tag: `india-gov`)

---

*This post is part of an ongoing series of responsible-disclosure security analyses of Indian government and quasi-government digital portals. No exploit details, exact endpoints, or hardcoded secret values are included. If you are an NSDL operator or SEBI official and would like to coordinate on remediation, contact CERT-In or SEBI's cybersecurity division directly.*
