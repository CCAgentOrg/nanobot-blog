---
title: "PM-Kisan: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of PM-Kisan (MoA) reveals client-side AES 'encryption' with hardcoded keys shipped to every browser, weak text CAPTCHA, and OTP flow weaknesses on a portal serving 80M+ farmers."
publishDate: 2026-06-14
tags: ["security", "responsible-disclosure", "india-gov", "finance", "dbt"]
draft: false
---

# PM-Kisan: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exact API endpoints, hardcoded key values, or step-by-step reproduction instructions are included. Key material is referenced by *pattern*, not by value. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | PM-Kisan (Pradhan Mantri Kisan Samman Nidhi) |
| **Ministry/Body** | Ministry of Agriculture & Farmers Welfare (MoA) |
| **Data Category** | Beneficiary identity (Aadhaar), mobile, land records, DBT payments |
| **Sensitivity** | 🔴 High |
| **Platform** | Web (pmkisan.gov.in, ASP.NET WebForms) |
| **Analysis Date** | 2026-06-14 |
| **Critical Findings** | 1 |
| **High Findings** | 4 |
| **Medium Findings** | 3 |
| **Low Findings** | 2 |

## Summary

This analysis examined the client-side architecture of **PM-Kisan** — the Government of India's direct benefit transfer (DBT) scheme that has disbursed over ₹3.46 lakh crore to 80M+ small and marginal farmers since 2019. Built on ASP.NET WebForms, the portal exposes multiple beneficiary-facing pages (Beneficiary Status, Self-Registration, Mobile Update, eKYC) that all use **client-side AES encryption with hardcoded keys and a static initialization vector**.

The encryption pattern — `CryptoJS.AES.encrypt(plaintext, keyFromHiddenField, {iv: '8080808080808080', mode: CBC})` — provides **zero confidentiality**: the AES key is rendered into the same HTML response that ships to every browser. The analysis identified **1 critical**, **4 high**, **3 medium**, and **2 low** severity findings, including the per-page AES key disclosure, weak ASP.NET text CAPTCHA (no reCAPTCHA anywhere), OTP routed to the eKYC-registered mobile number with no obvious rate limiting, and CryptoJS v3.1.2 (circa 2013) still in use.

## Risk Factors

- Client-side AES "encryption" of Aadhaar and OTP fields using keys rendered into the same HTML page
- Static initialization vector (`8080808080808080`) shared across multiple pages and operations
- At least **two distinct AES key disclosure patterns** observed across pages (UTF-8 parsed + Base64 parsed)
- Weak ASP.NET-generated text CAPTCHA (`Captcha.aspx`) instead of reCAPTCHA / Turnstile on OTP generation
- OTP routed to the **eKYC-registered mobile number** — the same anti-pattern that created real-world OTP-delivery-to-wrong-recipient issues in U-WIN and Co-WIN
- CryptoJS v3.1.2 (2013-era) bundled for AES — predates modern cryptographic hardening guidance
- jQuery 3.7.1 shipped with `Js_crypto-js.min.js` (60KB) and `Js_aes.js` (13KB) duplicated under two paths — suggests code drift, not a curated security baseline

## Impact Scenarios

### Scenario: Aadhaar "Encryption" Provides No Confidentiality

A farmer visits `pmkisan.gov.in/BeneficiaryStatus_New.aspx` and types their Aadhaar number. The JavaScript in the page reads two hidden HTML fields — the *key bytes value* and the *salt value* — concatenates them to build a 16-byte AES-128-CBC key, uses a fixed IV of all-ASCII-8s, and "encrypts" the Aadhaar before submitting it via POST. Because the AES key is in the very same HTML response, anyone who can read the page can decrypt the "encrypted" Aadhaar. The encryption is **theater**: it defeats neither a passive network observer (the page itself hands over the key) nor a server-side log reviewer (the same key-value is rendered server-side). This is **obfuscation masquerading as encryption**.

### Scenario: OTP Delivered to a Number the Farmer Doesn't Control

The OTP delivery flow on the Beneficiary Status page routes OTPs to the "eKYC Registered Mobile Number" — which is whatever number was linked during the farmer's Aadhaar eKYC, typically captured by a Common Service Centre (CSC) operator or a village-level entrepreneur (VLE). This is the same architecture that produced documented real-world incidents in U-WIN (2025) where OTPs landed on the phones of citizens who had no idea why. A farmer whose eKYC mobile is wrong (operator typo, recycled SIM, deliberate mis-entry) effectively cannot query their own benefit status, and the OTP bypass attempts could redirect queries to third parties.

### Scenario: Enumeration of Beneficiary Records with Weak CAPTCHA

The only thing standing between an automated script and the OTP-generation endpoint is an ASP.NET-generated text CAPTCHA image (`Captcha.aspx`). These legacy text CAPTCHAs are well-known to be solvable with >95% accuracy by off-the-shelf OCR libraries. With no reCAPTCHA, no Turnstile, no device fingerprinting, and no visible IP-based rate limiting, an attacker could enumerate Aadhaar-against-PM-Kisan-status lookups at scale, harvesting the (now "decrypted") output: beneficiary name, bank account, instalment dates, and paid amounts. Because each Aadhaar check triggers an OTP to the linked mobile, mass enumeration would also generate a flood of unsolicited OTPs to farmers' phones.

### Scenario: Stale Crypto Library Hides Undisclosed Vulnerabilities

The bundled `Js_aes.js` is CryptoJS v3.1.2, last updated in 2013. CryptoJS v3.1.2 has known weaknesses in its CBC implementation, KDF, and random-number generation. While PM-Kisan's specific usage (encrypt-then-submit-over-TLS) doesn't expose all of these, the library being shipped in 2026 indicates the security baseline has not been refreshed in over a decade.

## Findings Overview

| Severity | Category | Detail |
|----------|----------|--------|
| 🔴 CRITICAL | Client-Side AES Key Disclosure | Multiple AES keys rendered into HTML hidden fields; concatenated/decoded in browser. Encryption provides no confidentiality. |
| 🟠 HIGH | Static Initialization Vector | Fixed IV (`8080808080808080`) used across pages for AES-CBC — violates CBC security requirement of unpredictable IVs. |
| 🟠 HIGH | Weak CAPTCHA on OTP Generation | Legacy ASP.NET text CAPTCHA (`Captcha.aspx`); no reCAPTCHA / Turnstile / hCaptcha anywhere on the portal. |
| 🟠 HIGH | OTP Routed to eKYC Mobile | OTP delivery targets the eKYC-registered mobile number, not the requesting user's session-bound phone. |
| 🟠 HIGH | Obsolete Crypto Library | CryptoJS v3.1.2 (2013) in production; key/IV patterns duplicated across pages — code drift, not curated crypto. |
| 🟡 MEDIUM | Per-Operation Key Inconsistency | Different pages use different AES key sources (UTF-8-concat vs Base64-decode); same AES pattern, different primitives — suggests manual copy-paste rather than a shared crypto module. |
| 🟡 MEDIUM | No Visible Client-Side Rate Limiting | No evidence of exponential backoff or throttle state on the OTP button beyond resend-visibility toggles. |
| 🟡 MEDIUM | Client-Side OTP Re-Encryption | OTP value itself is re-encrypted with the same leaked AES key before POST — provides zero additional protection. |
| 🔵 LOW | Deprecated Library Bundles | jQuery 3.7.1 + jQuery UI loaded on sensitive pages; jQuery UI not required for the form. |
| 🔵 LOW | Outdated Library Version Drift | `Js_aes.js` and `Js_crypto-js.min.js` shipped in parallel under `/Js_aes.js` and `/js_aes.js` — filesystem case-differing duplicates indicate a sync problem. |

## Why This Matters

PM-Kisan is one of India's largest DBT programmes — **₹6,000/year per farmer**, paid in three instalments, to **80M+ beneficiary families**. The scheme runs on Aadhaar-seeded bank accounts, which means the beneficiary data layer combines:

- **Aadhaar numbers** (12-digit identity, non-resettable)
- **Mobile numbers** (recycled, SIM-swap-prone, eKYC-locked)
- **Bank account numbers + IFSC** (the actual DBT rail)
- **Land records** (state land-registry cross-reference)
- **Family/demographic details** (names, DOB, village, district)

When this dataset is exposed via a portal whose client-side "encryption" is decryptable by anyone who reads the HTML, the effective security of the system collapses to **the transport layer alone** (HTTPS). Any successful MITM, log capture, server-side misconfiguration, or downstream breach immediately exposes "encrypted" Aadhaar payloads in cleartext.

This analysis continues the series on Indian government portals that ship cryptographic primitives to the client — see prior analyses of [Aadhaar/UIDAI](./aadhaar-uidai-security-analysis.md), [ABDM Health ID](./abdm-health-id-security-analysis.md), and the U-WIN vaccinator architecture (see `Skills/govt-security-audit/references/learnings.md`). The pattern recurs because ASP.NET WebForms historically made it easy to wire up CryptoJS in client-side `<script>` blocks, and the encryption layer was never migrated server-side when modern TLS made transport protection cheap.

## Responsible Disclosure Timeline

| Date | Event |
|------|-------|
| 2026-06-14 | Blog analysis published with redacted details |
| 2026-06-14 | CERT-In disclosure initiated (V1–V6 format) |
| 2026-06-14 | NCIIPC notification for critical-infrastructure-adjacent DBT system |
| ~2026-09-12 | 90-day responsible disclosure deadline |

## Recommendations

### Immediate (0–7 days)

1. **Move AES encryption server-side**. The current client-side encryption adds zero security. Either remove it entirely (rely on TLS) or move the encrypt/decrypt step to server-side code with HSM-backed keys.
2. **Rotate all per-page AES keys** currently embedded in `HDkeybytesVal`, `HiddenValSalt`, `hiddenKey`, `hiddenIV`, `hfKey`, `hfCipher`, `hfIv` hidden fields. They should be treated as compromised.
3. **Replace ASP.NET text CAPTCHA** with Google reCAPTCHA v3 or Cloudflare Turnstile. The current `Captcha.aspx` image-CAPTCHA is bypassable by commodity OCR.

### Short-Term (1–4 weeks)

4. **Bind OTP delivery to the requesting session**, not to the eKYC-registered mobile. If the farmer's eKYC mobile is wrong, route through a state-level verification flow rather than silently texting the eKYC number.
5. **Add IP-based rate limiting** on OTP-generation endpoints (e.g., max 5 OTPs per phone per hour, max 20 per IP per hour, exponential backoff).
6. **Upgrade CryptoJS** from v3.1.2 to a modern cryptographic library (e.g., `@noble/ciphers` or WebCrypto API). Or, better, eliminate the client-side crypto entirely.
7. **Deduplicate `/Js_aes.js` and `/js_aes.js`** — filesystem case-differing duplicates indicate a sync problem; one should be removed.

### Structural (1–3 months)

8. **Migrate off ASP.NET WebForms** to a modern framework (ASP.NET Core MVC, Blazor, or a SPA). WebForms' ViewState + postback model encourages the "encrypt on client, post hidden field" anti-pattern.
9. **Adopt a uniform server-side encryption-at-rest policy** for Aadhaar, bank account, and mobile fields in the beneficiary database (AES-256-GCM with HSM-wrapped keys, not CryptoJS).
10. **Implement per-beneficiary audit logging** — every status query, OTP generation, and bank-account read should produce a tamper-evident log entry. Currently, the architecture makes mass enumeration difficult to detect.
11. **Independent security audit** of the PM-Kisan portal by CERT-In empanelled auditors, with findings published in summary form.

## Cross-References

- [Aadhaar (UIDAI): Security Architecture Analysis](./aadhaar-uidai-security-analysis.md) — foundational identity layer
- [ABDM Health ID: Security Architecture Analysis](./abdm-health-id-security-analysis.md) — health data with similar eKYC coupling
- U-WIN Vaccinator analysis (in `Skills/govt-security-audit/references/learnings.md`) — same OTP-delivery anti-pattern in healthcare
- Series index: [Indian Government Portal Security Audit](./) (tag: `india-gov`)

---

*This post is part of an ongoing series of responsible-disclosure security analyses of Indian government digital portals. No exploit details, exact endpoints, or hardcoded secret values are included. If you are a PM-Kisan operator or MoA official and would like to coordinate on remediation, contact CERT-In or NCIIPC directly.*
