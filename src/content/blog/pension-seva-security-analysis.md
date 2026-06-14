---
title: "Pension Seva: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of Indian government pension portals (MoF / DoPPW) reveals client-side SHA256 password hashing with a hardcoded salt shipped in HTML, weak text CAPTCHA, and OTP routed to registered contact details."
publishDate: 2026-06-14
tags: ["security", "responsible-disclosure", "india-gov", "finance", "pension"]
draft: false
---

# Pension Seva: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exact API endpoints, hardcoded key values, or step-by-step reproduction instructions are included. Salt material is referenced by *pattern*, not by value. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | Pension Seva / Pensioners' Portal (umbrella term) |
| **Ministry/Body** | Ministry of Finance / Dept. of Pension & Pensioners' Welfare |
| **Data Category** | Pensioner identity (PPO/PAN/Aadhaar), password, mobile, bank account, life certificate |
| **Sensitivity** | 🔴 High |
| **Platform** | Web (dotpension.gov.in working; pensionersportal.gov.in unreachable at audit time; SBI Pension Seva at sbi.bank.in) |
| **Analysis Date** | 2026-06-14 |
| **Critical Findings** | 1 |
| **High Findings** | 3 |
| **Medium Findings** | 3 |
| **Low Findings** | 2 |

## Summary

This analysis examined the client-side architecture of three Indian pension-facing portals under the Ministry of Finance / DoPPW umbrella: the **central Pensioners' Portal** (`pensionersportal.gov.in`), the **DoT Pension Portal** (`dotpension.gov.in`), and **SBI Pension Seva** (`pensionseva.sbi.bank.in`, the public-sector-bank-operated disbursal portal that "Pension Seva" most commonly refers to).

At audit time, `pensionersportal.gov.in` was **completely unreachable** — DNS resolved but TCP port 443 timed out for the entire audit window — meaning the central pensioners' portal was either down, firewalled, or rate-limited. This itself is a finding: a critical-infrastructure-adjacent portal for ~70 lakh central government pensioners can be unavailable for extended periods.

The working portals (`dotpension.gov.in`, `pensionseva.sbi.bank.in`) both use **client-side cryptographic operations** on passwords / account numbers before transmission. DoT Pension Portal computes `SHA256(SHA256(username + password) + hardcodedSalt)` in the browser, where the salt is a 20-character ASCII string baked into a hidden HTML field. SBI Pension Seva uses **per-request random AES key/IV pairs** generated client-side and sent *alongside* the ciphertext.

The analysis identified **1 critical**, **3 high**, **3 medium**, and **2 low** severity findings.

## Risk Factors

- Central Pensioners' Portal (`pensionersportal.gov.in`) was unreachable during the audit window — service availability for a critical-infrastructure system
- DoT Pension Portal hardcodes a 20-character SHA256 salt in every login page HTML response
- DoT Pension Portal password hashing uses **plain SHA256** (fast, GPU-friendly) instead of bcrypt/scrypt/argon2 — defeats the purpose of password hashing
- SBI Pension Seva ships AES key+IV alongside ciphertext in the same POST request — equivalent to sending plaintext
- Both portals use legacy ASP.NET-generated text CAPTCHAs (no reCAPTCHA / Turnstile / hCaptcha anywhere)
- Both portals route OTP to "registered contact details" — same anti-pattern that caused OTP delivery issues in U-WIN and Co-WIN
- SBI Pension Seva bundles CryptoJS v3.0.2 — even older than PM-Kisan's v3.1.2; predates 2013 hardening guidance
- DoT Pension Portal CSP permits `unsafe-inline` and `unsafe-eval` in `default-src`
- DoT Pension Portal CSP whitelists `http://ajax.googleapis.com` (HTTP, not HTTPS) — passive downgrade risk

## Impact Scenarios

### Scenario: Central Pensioners' Portal Outage

For the entire audit window (~5 minutes of probes from multiple tools), `pensionersportal.gov.in` (164.100.192.57:443) accepted no TCP connections — DNS resolved cleanly but the TLS endpoint was dark. If this is a routine pattern, ~70 lakh central government pensioners depending on the portal for life certificate submission (Jeevan Pramaan), pension slip download, and grievance redressal are at the mercy of an unreliable host. For an elderly user base with limited digital fallbacks, this is more than a UX issue — it can stall pension disbursal until physical CSC visits become possible.

### Scenario: Static Salt + Plain SHA256 Enables Rainbow Tables

The DoT Pension Portal login flow computes `SHA256(SHA256(username + password) + STATIC_SALT)` in the browser and posts the hash. Three problems compound:

1. **The static salt is shipped to every browser.** Anyone reading the HTML has the salt. Salt only protects against pre-computed rainbow tables when the salt is secret or per-user; a public salt is just a domain separator.
2. **SHA256 is fast.** A modern GPU can compute billions of SHA256/sec. Even with the salt, an attacker with a leaked hash dump can brute-force common passwords (and Indian-password corpora are well-documented) trivially.
3. **The inner hash `SHA256(username + password)` is the effective transmitted secret.** Once an attacker recovers `SHA256(username + password)` for one user (e.g., via a downstream server leak), they can re-salt it client-side and authenticate without ever learning the plaintext password. The hashing scheme is password-equivalent, not password-derived.

This is the textbook case for using **bcrypt, scrypt, or argon2id** — slow, memory-hard KDFs that make brute-force uneconomic. Plain SHA256 in 2026 is a known-bad pattern.

### Scenario: AES Key Shipped With Ciphertext

SBI Pension Seva's `onSubmitEncr()` and `vlcValidateAcct()` functions generate a random AES key/IV per request, encrypt the password or account number, then **include the key and IV in plaintext in the same POST body**. The encrypted fields and the keys are decoded on the server side from the same request. This pattern provides **zero confidentiality** beyond the TLS transport: any party who can read the POST body (a MITM with compromised TLS, a server-side log, a downstream reverse proxy) immediately has both the key and the ciphertext. The encryption is theatre.

### Scenario: OTP Delivered to "Registered Contact"

Both portals describe OTP delivery to the user's "registered contact" — typically whatever mobile/email was captured at enrolment. For pensioners, the registered contact is often whatever a CSC operator or VLE entered 5+ years ago, possibly before the pensioner themselves had a smartphone. SIM recycling, operator typos, and deceased-pensioner SIMs all produce real-world cases where OTPs land on phones the pensioner no longer controls. This is the same architecture that produced documented OTP-delivery-to-wrong-recipient incidents in U-WIN (2025) and PM-Kisan (2026).

## Findings Overview

| Severity | Category | Detail |
|----------|----------|--------|
| 🔴 CRITICAL | Service Availability | Central Pensioners' Portal (`pensionersportal.gov.in`) unreachable on 443 for entire audit window |
| 🟠 HIGH | Static Client-Side Salt | DoT Pension Portal ships 20-character ASCII salt in HTML hidden field for SHA256 password hashing |
| 🟠 HIGH | Inappropriate Hash Algorithm | Plain `SHA256` used for password hashing (fast, GPU-friendly) instead of bcrypt/argon2 |
| 🟠 HIGH | AES Key+IV Shipped With Ciphertext | SBI Pension Seva includes the AES key and IV in the same POST body as the ciphertext — encryption theatre |
| 🟡 MEDIUM | Weak CAPTCHA | Legacy ASP.NET text CAPTCHA at `/Login/CaptchaImage`; no reCAPTCHA / Turnstile / hCaptcha |
| 🟡 MEDIUM | OTP to Registered Contact | OTP routed to enrolment-time registered contact — SIM-recycling / VLE-typo risk |
| 🟡 MEDIUM | Permissive CSP | `unsafe-inline` + `unsafe-eval` in CSP `default-src`; HTTP (not HTTPS) CDN whitelist entry |
| 🔵 LOW | Obsolete Crypto Library | CryptoJS v3.0.2 (2009–2012) bundled in production at SBI Pension Seva |
| 🔵 LOW | Deprecated X-XSS-Protection Header | `X-XSS-Protection: 1; mode=block` set (deprecated per MDN) |

## Why This Matters

Indian pension portals sit at the intersection of three high-stakes data categories:

- **Identity**: PPO numbers, PAN numbers, Aadhaar-seeded bank accounts
- **Financial**: Bank account numbers, IFSC, pension amounts, life certificate status
- **Demographic**: An elderly population with limited digital literacy, often dependent on intermediaries (CSC operators, VLEs, bank staff) for online transactions

When the cryptographic layer that protects passwords and account numbers is **shipped to the client**, the effective security collapses to the transport layer (HTTPS) and the server-side rate limiter. Either failure mode — a TLS-terminating proxy with logging, a reverse-proxy misconfiguration, a brute-force protection bypass — exposes pensioner credentials directly.

This analysis continues the series on Indian government portals that ship cryptographic primitives to the client. See prior analyses of [Aadhaar/UIDAI](./aadhaar-uidai-security-analysis.md), [PM-Kisan](./pmkisan-security-analysis.md), and the U-WIN vaccinator architecture. The pattern recurs because ASP.NET WebForms / MVC scaffolding historically made it easy to wire up CryptoJS in client-side `<script>` blocks, and the encryption layer was never migrated server-side when modern TLS made transport protection cheap.

## Responsible Disclosure Timeline

| Date | Event |
|------|-------|
| 2026-06-14 | Blog analysis published with redacted details |
| 2026-06-14 | CERT-In disclosure initiated for DoT Pension Portal and SBI Pension Seva |
| 2026-06-14 | DoPPW notification for central Pensioners' Portal availability issue |
| ~2026-09-12 | 90-day responsible disclosure deadline |

## Recommendations

### Immediate (0–7 days)

1. **Investigate the Pensioners' Portal outage.** Confirm whether `pensionersportal.gov.in` 443 timeouts are transient or persistent. If persistent, restore service and add external uptime monitoring with public status page.
2. **Rotate the static SHA256 salt** currently embedded in the DoT Pension Portal login HTML. Treat the existing value as compromised.
3. **Replace plain SHA256 with bcrypt / argon2id** for password verification. Move the hashing server-side; do not rely on client-side hashing at all.

### Short-Term (1–4 weeks)

4. **Replace ASP.NET text CAPTCHA** with Google reCAPTCHA v3 or Cloudflare Turnstile on all login, OTP-generation, and grievance-submission endpoints.
5. **Eliminate the SBI Pension Seva "AES-then-send-key" pattern.** Either remove client-side encryption entirely (rely on TLS) or implement proper hybrid encryption with a server-provided public key (RSA-OAEP / ECDH) so the AES key never travels.
6. **Bind OTP delivery to the current session device** rather than the enrolment-time registered contact. For pensioners whose registered mobile is wrong, route through a state-level verification flow.
7. **Add IP-based and account-based rate limiting** (e.g., 5 OTPs per phone per hour, 20 per IP per hour, exponential backoff after 3 failed logins).
8. **Upgrade CryptoJS** from v3.0.2 / v3.1.2 to a modern library (e.g., `@noble/ciphers` or WebCrypto API), or eliminate client-side crypto entirely.

### Structural (1–3 months)

9. **Adopt a uniform server-side password policy** across all pension portals — bcrypt cost ≥ 12 or argon2id with recommended parameters.
10. **Tighten the DoT Pension Portal CSP** — remove `unsafe-inline` and `unsafe-eval` from `default-src`; move inline scripts to nonced external files; update HTTP CDN entries to HTTPS.
11. **Independent security audit** of all three portals (Pensioners' Portal, DoT Pension Portal, SBI Pension Seva) by CERT-In empanelled auditors, with findings published in summary form.
12. **Publish a status / uptime page** for the central Pensioners' Portal so pensioners and CSC operators can verify outages without filing grievances.

## Cross-References

- [Aadhaar (UIDAI): Security Architecture Analysis](./aadhaar-uidai-security-analysis.md) — foundational identity layer
- [PM-Kisan: Security Architecture Analysis](./pmkisan-security-analysis.md) — same client-side-AES anti-pattern in DBT
- U-WIN Vaccinator analysis — same OTP-to-wrong-recipient anti-pattern in healthcare (see `Skills/govt-security-audit/references/learnings.md`)
- Series index: [Indian Government Portal Security Audit](./) (tag: `india-gov`)

---

*This post is part of an ongoing series of responsible-disclosure security analyses of Indian government digital portals. No exploit details, exact endpoints, or hardcoded secret values are included. If you are a portal operator or ministry official and would like to coordinate on remediation, contact CERT-In or NCIIPC directly.*
