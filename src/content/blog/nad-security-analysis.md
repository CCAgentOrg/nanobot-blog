---
title: "NAD (National Academic Depository) Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of NAD/DigiLocker Academic Depository reveals hardcoded Firebase API keys, development/beta domains exposed in CORS headers, wildcard CORS on the API server, defunct CDN dependency, and outdated Firebase SDK — all in a system handling academic identity and degree records of Indian citizens."
publishDate: 2026-06-17
tags: ["security", "responsible-disclosure", "india-gov", "identity", "digilocker"]
draft: false
---

# NAD (National Academic Depository): Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | NAD — National Academic Depository |
| **Ministry/Body** | Ministry of Education (MoE) |
| **Operated By** | DigiLocker (MeitY) |
| **Data Category** | Identity & Academic Documents |
| **Sensitivity** | 🟠 High |
| **Platform** | Web (DigiLocker-hosted SPA) |
| **URLs** | nad.gov.in → nad.digilocker.gov.in |
| **Analysis Date** | 2026-06-17 |
| **Critical Findings** | 1 |
| **High Findings** | 3 |
| **Medium Findings** | 2 |
| **Low Findings** | 1 |

## What is NAD?

The National Academic Depository (NAD) is India's centralised digital repository for academic awards — degrees, diplomas, certificates, and marksheets issued by universities, boards, and academic institutions. It was established by the Ministry of Education (then MHRD) and is now operated through DigiLocker under MeitY. Academic institutions lodge award data into NAD; students access their digital credentials; and employers/verifiers confirm authenticity.

This makes NAD a **foundational identity layer** — academic credentials serve as KYC documents across employment, higher education, and immigration. A compromise in NAD's integrity doesn't just affect one service; it cascades across every system that relies on degree verification.

## Summary

This analysis examined the client-side architecture of the NAD web portal, now hosted at `nad.digilocker.gov.in`. The application is a server-rendered HTML/JS application with Firebase integration for analytics.

The analysis identified **7 categories** of architectural concerns, with **1 critical**, **3 high**, **2 medium**, and **1 low** severity findings.

## Risk Factors

- Hardcoded Firebase API key and project configuration in client-side JavaScript — extractable by anyone
- Development and beta domain names exposed in CORS allow-origin headers — reveals internal infrastructure
- Wildcard CORS (`Access-Control-Allow-Origin: *`) on the NAD API server — any origin can make requests
- Defunct third-party CDN (rawgit.com) used in production — supply chain risk
- Outdated Firebase SDK (v7.23.0, released 2020) — known vulnerabilities may exist
- No CAPTCHA visible on the student registration/login pages
- Rate limit counter does not decrement — rate limiting may not be enforced correctly

## Impact Scenarios

### Scenario: Development Infrastructure Exposure

The CORS `Access-Control-Allow-Origin` header on the main NAD portal explicitly lists internal development and staging domains: `dev-nad-app.dl6.in`, `betanad.dl6.in`, `betanadapi.dl6.in`, `devabc.dl6.in`, `nd-devapi.dl6.in`, `beta-admin.api-setu.in`, and `dev.api-setu.in`. These domain names reveal the internal development infrastructure topology. An attacker who can compromise any of these dev/beta environments (which are likely less hardened than production) could leverage that access against the production system through the CORS trust relationship.

### Scenario: Wildcard CORS on API Server

The NAD API server at `nadapi.digilocker.gov.in` returns `Access-Control-Allow-Origin: *`, meaning any website on the internet can make cross-origin requests to this API from a user's browser. If the API has any authenticated endpoints that rely on cookies or session tokens (rather than explicit Authorization headers), a malicious website could silently call those endpoints while a user is logged in to NAD — exfiltrating academic records, degree verification data, or personal information without the user's knowledge.

### Scenario: Defunct CDN — Supply Chain Attack Vector

The application loads the `anno.js` library from `rawgit.com` — a CDN service that was shut down in 2018. While the specific URL currently returns a 404, the domain is no longer controlled by its original operators. If the domain is acquired by a malicious party, they could serve modified JavaScript to NAD users, gaining full code execution in the user's browser session. This is not theoretical — rawgit.com's shutdown was explicitly a security concern, and the NAD application still references it.

### Scenario: Outdated Firebase SDK

The application uses Firebase JS SDK v7.23.0, released in late 2020. This is over 5 years old. Google has released multiple major versions since then, with security patches and deprecation fixes. Outdated SDKs may contain known vulnerabilities. More critically, the Firebase configuration (API key, project ID, storage bucket, messaging sender ID) is embedded directly in the page source, which — combined with an outdated SDK — could expose the Firebase project to known exploits against older client libraries.

## Findings Overview

| Severity | Category | Matches |
|----------|----------|---------|
| 🔴 CRITICAL | Wildcard CORS on API Server | 1 |
| 🟠 HIGH | Hardcoded Firebase API Key in Client Code | 1 |
| 🟠 HIGH | Development/Beta Domains in CORS Headers | 7+ |
| 🟠 HIGH | Defunct CDN (rawgit.com) in Production | 1 |
| 🟡 MEDIUM | Outdated Firebase SDK (v7.23.0) | 1 |
| 🟡 MEDIUM | No CAPTCHA on OTP/Login Flow | 1 |
| 🔵 LOW | Rate Limit Counter Not Decrementing | 1 |

*Specific values, headers, and endpoint details omitted per responsible disclosure practices.*

## Security Headers Assessment

The NAD portal implements several security headers correctly:

| Header | Status | Note |
|--------|--------|------|
| Strict-Transport-Security | ✅ Present | `max-age=31536000; includeSubDomains; preload` |
| X-Frame-Options | ✅ Present | `SAMEORIGIN` |
| X-Content-Type-Options | ✅ Present | `nosniff` |
| X-XSS-Protection | ✅ Present | `1; mode=block` |
| Referrer-Policy | ✅ Present | `same-origin` |
| Permissions-Policy | ✅ Present | Restricts camera, geolocation, microphone |
| Content-Security-Policy | ⚠️ Partial | Present but allows `unsafe-inline`, `unsafe-eval`, and broad domain whitelisting including dev/beta domains |
| Cache-Control | ✅ Present | `no-cache, no-store, must-revalidate` |
| Clear-Site-Data | ✅ Present | Clears cache, cookies, storage on response |

The CSP is noteworthy: it explicitly whitelists development domains (`dev-nad-app.dl6.in`, `betanad.dl6.in`, `cdn-nad.dl6.in`) in `script-src` and `connect-src` directives. This means the browser will execute scripts from these development environments, creating a dependency chain between development infrastructure security and production security.

## Why This Matters

India's Digital Public Infrastructure (DPI) — Aadhaar, UPI, Co-WIN, U-WIN, DigiLocker — is built on a model of scale and inclusion. But inclusion without protection is a trap. NAD is the canonical store of academic credentials — the documents that prove who studied what, where. When a student's degree record can be accessed or modified through gaps in CORS policy or client-side key exposure, it affects:

- **Employment verification**: Employers rely on NAD to confirm degree authenticity
- **Immigration**: Foreign universities and embassies use degree verification for admissions and visas
- **Higher education**: Indian institutions use NAD for transcript verification during admissions
- **Financial services**: Banks and NBFCs accept degree certificates as address/identity proof for KYC

A compromise in NAD doesn't just leak data — it undermines the trust value of every academic credential issued in India.

The [CBSE data breach incident (2026)](https://www.thehindu.com/education/cbse-data-breach/) demonstrated that traditional disclosure routes — CERT-In reports, ministry emails — do not produce timely fixes. The researcher who found the vulnerabilities waited months, only to be met with denial and inaction. Public pressure, parliamentary questions, and media coverage eventually forced acknowledgment.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-17 | Blog post published (impact only, no exploit details) |
| Pending | CERT-In report filed |
| Pending | NCIIPC notification (NAD is critical academic infrastructure) |
| Pending | Direct contact with DigiLocker / MeitY CISO |
| 2026-09-15 | Full public disclosure deadline (90 days) |

## Recommendations

### Immediate (0-7 days)
- Remove rawgit.com reference immediately — replace with a self-hosted or reputable CDN copy of anno.js
- Remove development and beta domains from CORS allow-origin headers on the production server
- Change the wildcard CORS (`*`) on `nadapi.digilocker.gov.in` to origin-specific allowlists
- Move Firebase API key configuration server-side instead of embedding in client HTML

### Short-term (1-4 weeks)
- Upgrade Firebase SDK from v7.23.0 to the latest version (v10+)
- Clean up CSP to remove dev/beta domain whitelisting
- Implement CAPTCHA on student login/registration OTP flows
- Audit and rotate Firebase project credentials
- Verify rate limiting enforcement (counter appears static)

### Structural (1-3 months)
- Adopt a public vulnerability disclosure program (VDP)
- Separate development and production infrastructure domains and CORS policies
- Implement continuous security testing in CI/CD
- Engage independent security auditors for annual assessments
- Align with DPDP Act 2023 requirements for sensitive personal data (academic records qualify)
- Consider migrating from the legacy nad.gov.in domain (static Apache site) — the dual-domain architecture is confusing and the old site uses an outdated tech stack

---

*This analysis is part of an ongoing audit of Indian government digital services. See [the project page](/blog/tag/security/) for other analyses.*
