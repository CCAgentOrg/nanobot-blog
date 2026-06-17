---
title: "FSSAI Security Architecture Analysis — Responsible Disclosure"
description: "Deep analysis of FSSAI's FoSCoS and FICS portals reveals hardcoded AES keys in client-side JavaScript, client-side OTP verification, ECB-mode encryption, wildcard CORS, and MD5-based password hashing — architectural weaknesses that could expose food safety licensing and import clearance data of Indian businesses and citizens."
publishDate: 2026-06-17
tags: ["security", "responsible-disclosure", "india-gov", "identity", "fssai", "foscos"]
draft: false
---

# FSSAI: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | FSSAI (Food Safety and Standards Authority of India) |
| **Ministry/Body** | MoF&H (Ministry of Health & Family Welfare) |
| **Sub-portals Analyzed** | FoSCoS (Food Safety Compliance System), FICS (Food Import Clearance System) |
| **Data Category** | Identity & Documents (FBO licenses, food import clearances, personal records) |
| **Sensitivity** | 🟡 Medium |
| **Platform** | Web (Angular SPA + legacy ASP.NET) |
| **Analysis Date** | 2026-06-17 |
| **Critical Findings** | 2 |
| **High Findings** | 3 |
| **Medium Findings** | 3 |
| **Low Findings** | 2 |

## Summary

This analysis examined the client-side architecture of **FSSAI** and its key sub-portals — **FoSCoS** (foscos.fssai.gov.in, the licensing and compliance system) and **FICS** (fics.fssai.gov.in, the food import clearance system). FSSAI operates under **MoF&H** and handles **food business operator (FBO) licensing, registration, compliance, and import clearance data** — classified as **medium** sensitivity, though the personal and business data involved (names, addresses, identity documents, financial transactions via Razorpay) elevates the real-world risk.

The analysis identified **10 categories** of architectural concerns, with **2 critical**, **3 high**, **3 medium**, and **2 low** severity findings. The most severe issues involve hardcoded encryption keys shipped in client-side JavaScript and client-side OTP verification logic.

## Risk Factors

- **Hardcoded AES encryption key in public JavaScript file** — the `env.js` file shipped to every browser contains base64-encoded encryption keys used for API payload encryption. Anyone can extract these.
- **Client-side OTP verification** — the FoSCoS guest login verifies OTP by comparing the encrypted user input against a server-sent encrypted OTP value on the client side. This means the encrypted OTP value is sent to the browser, where it can be intercepted.
- **AES-ECB mode for payload encryption** — ECB (Electronic Codebook) mode does not provide semantic security. Identical plaintext blocks produce identical ciphertext blocks, enabling pattern analysis.
- **Wildcard CORS on FICS** — `Access-Control-Allow-Origin: *` allows any website to make authenticated requests to the FICS portal, enabling CSRF-based data exfiltration.
- **MD5-based password hashing with hardcoded challenge** — FICS uses HMAC-MD5 for password processing, including a hardcoded challenge string `$$CHALLENGE` in client-side JavaScript.
- **No certificate pinning** — no transport-level pinning for high-sensitivity data flows.
- **Auth tokens stored in sessionStorage** — access tokens and user session details stored in browser sessionStorage, accessible to any XSS or browser extension.
- **Caesar-cipher-style obfuscation** — the `endecrypt_js` function in `encmd5.js` uses a simple character offset (diff=81) for text "encryption".

## Impact Scenarios

### Scenario: Hardcoded Encryption Key Extraction

FoSCoS uses client-side AES encryption for all API payloads — both requests and responses. The encryption key is statically embedded in `env.js`, a publicly accessible JavaScript file. A comment in the code states "injected from Docker," but the key is identical for every visitor. Since anyone with a browser can extract this key, the entire request/response encryption layer provides no real protection — it is obfuscation, not encryption. API payloads can be decrypted, read, and fabricated by any party with access to the key.

This is particularly concerning because FoSCoS handles food business licensing data, personal identity documents, and integrates with Razorpay for payment processing.

### Scenario: Client-Side OTP Verification Bypass

The FoSCoS guest login flow sends the encrypted OTP value to the browser as a hidden form field (`genratedOtpCode`). When the user submits their OTP, the client-side JavaScript encrypts the user's input and compares it against the pre-sent encrypted value. This means the correct OTP's encrypted form is already present in the page before the user enters anything. An attacker can simply extract this value from the DOM, bypassing the OTP entirely — the OTP is not a secret when its encrypted form is handed to the verifier.

In a system where mobile number is the sole identity anchor for guest access, OTP bypass grants unauthorized access to food safety records and licensing information.

### Scenario: Cross-Site Data Exfiltration via Wildcard CORS

FICS (Food Import Clearance System) returns `Access-Control-Allow-Origin: *` for all responses, alongside permissive CORS headers for methods and authorization headers. This means any arbitrary website can make cross-origin authenticated requests to FICS if a user is logged in. An attacker's website could silently fetch import clearance data, registered business details, or submit fraudulent import applications — all while the victim is unaware.

### Scenario: MD5 Password Hashing with Known Challenge

FICS uses HMAC-MD5 for password processing in its login flow. MD5 is cryptographically broken — collision attacks are practical and preimage resistance is weakened. Additionally, one code path references a hardcoded challenge string, making the password transformation deterministic and reproducible. If an attacker observes any password hash, they can reconstruct the original password far more efficiently than with modern hashing (bcrypt, scrypt, Argon2).

### Scenario: Identity Theft Chain

FSSAI licensing data includes business owner identity documents, addresses, and financial transactions. A breach here doesn't just affect food safety — the extracted identity documents (Aadhaar, PAN, FSSAI license numbers) could be used foridentity fraud across banking, taxation, and other government services.

## Findings Overview

| Severity | Category | Detail |
|----------|----------|--------|
| 🔴 CRITICAL | Hardcoded Encryption Key | AES payload/response encryption keys embedded in public `env.js` |
| 🔴 CRITICAL | Client-Side OTP Verification | OTP verification performed in browser; encrypted OTP value sent to client |
| 🟠 HIGH | AES-ECB Mode | Payload encryption uses ECB mode — no semantic security, pattern leakage |
| 🟠 HIGH | Wildcard CORS | FICS returns `Access-Control-Allow-Origin: *` with auth headers allowed |
| 🟠 HIGH | Weak Password Hashing (MD5 HMAC) | FICS uses HMAC-MD5 with hardcoded challenge for password processing |
| 🟡 MEDIUM | Auth Tokens in SessionStorage | Access tokens and user session stored in browser sessionStorage |
| 🟡 MEDIUM | No Certificate Pinning | No transport-level certificate pinning for sensitive data flows |
| 🟡 MEDIUM | Caesar-Cipher Obfuscation | `endecrypt_js` uses character offset of 81 — trivially reversible |
| 🔵 LOW | Verbose Security Configuration | Security headers present on FoSCoS but not on main fssai.gov.in |
| 🔵 LOW | Outdated Dependencies | Angular 2-era bundle patterns, jQuery 3.3.1/3.5.1 double-loading |

*Specific values, endpoints, and reproduction steps omitted per responsible disclosure practices.*

## Why This Matters

FSSAI's FoSCoS portal is the backbone of India's food safety licensing infrastructure. Every food business operator — from small street vendors to large food manufacturers — must register here. The system handles identity documents, business details, and payment processing for millions of entities.

When the encryption protecting API payloads uses a key that is shipped to every browser, and OTP verification happens client-side with the answer already in the page, the security architecture is fundamentally broken. These are not edge cases or configuration issues — they are design-level decisions that leave the entire system exposed.

India's Digital Public Infrastructure (DPI) — Aadhaar, UPI, Co-WIN, U-WIN, DigiLocker — is built on a model of scale and inclusion. But inclusion without protection is a trap. When the same mobile number that receives OTPs for a food license also receives OTPs for banking, taxation, and identity verification, the security of the weakest link becomes the security of the entire chain.

The [CBSE data breach incident (2026)](https://www.thehindu.com/education/cbse-data-breach/) demonstrated that traditional disclosure routes — CERT-In reports, ministry emails — do not produce timely fixes. The researcher who found the vulnerabilities waited months, only to be met with denial and inaction. Public pressure, parliamentary questions, and media coverage eventually forced acknowledgment.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-17 | Blog post published (impact only, no exploit details) |
| Pending | CERT-In report filed |
| Pending | NCIIPC notification (if critical infrastructure) |
| Pending | Direct contact with FSSAI CISO / IT team |
| 2026-06-17 + 90 days | Full public disclosure deadline |

## Recommendations

### Immediate (0-7 days)
- **Remove hardcoded encryption keys from client-side JavaScript** — move all encryption/decryption to the server side; client should never have access to API encryption keys
- **Fix OTP verification** — OTP must be verified server-side; never send the expected OTP value (even encrypted) to the client
- **Remove `Access-Control-Allow-Origin: *` from FICS** — restrict CORS to specific trusted origins
- **Rotate the currently exposed key** — since the key has been public, assume it is known and re-key

### Short-term (1-4 weeks)
- **Replace AES-ECB with AES-GCM or AES-CBC with HMAC** — authenticated encryption prevents tampering and pattern analysis
- **Replace MD5 HMAC password hashing with bcrypt/Argon2** — modern password hashing with server-side salting
- **Move all encryption to server-side** — API payloads should be encrypted/decrypted only on the server; HTTPS provides transport security
- **Move auth tokens from sessionStorage to HttpOnly cookies** — prevents JavaScript access to tokens

### Structural (1-3 months)
- **Adopt a public vulnerability disclosure program (VDP)** — FSSAI should have a clear, accessible security reporting channel
- **Implement continuous security testing in CI/CD** — static analysis and dependency scanning for all portals
- **Engage independent security auditors** — annual penetration testing of FoSCoS, FICS, and all sub-portals
- **Consolidate security posture across sub-portals** — FoSCoS has good headers; FICS and the main site do not. Standardize.
- **Align with DPDP Act 2023 requirements** — food business data includes personal data requiring compliance

---

*This analysis is part of an ongoing audit of Indian government digital services. See [the project page](/blog/tag/security/) for other analyses.*
