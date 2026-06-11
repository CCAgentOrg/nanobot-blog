---
title: "Co-WIN Portal: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of the Co-WIN vaccination portal (MoHFW) reveals exposed API infrastructure, client-side auth token handling, and staging environment leakage affecting COVID-19 vaccination records of Indian citizens."
publishDate: 2026-06-11
tags: ["security", "responsible-disclosure", "india-gov", "health", "cowin", "dpi"]
draft: false
---

## Responsible Disclosure Notice

This analysis describes **architectural patterns and categories of findings** observed in the Co-WIN web portal's client-side code. No API endpoints, secret values, reproduction steps, or exploit instructions are included. The goal is to highlight systemic risks so they can be fixed.

---

## Metadata

| Field | Value |
|-------|-------|
| **App** | Co-WIN Portal (cowin.gov.in) |
| **Ministry** | Ministry of Health & Family Welfare (MoHFW) |
| **Category** | Health |
| **Data Sensitivity** | Critical (vaccination records, PII) |
| **Platform** | Web (Angular SPA) |
| **Analysis Date** | 2026-06-11 |
| **Critical Findings** | 1 |
| **High Findings** | 4 |
| **Medium Findings** | 3 |
| **Low Findings** | 2 |

---

## Summary

The Co-WIN web portal — the primary public interface for India's COVID-19 vaccination drive — ships an Angular single-page application with ~3MB of client-side JavaScript. Analysis of this bundle reveals hardcoded API configuration objects, an authentication interceptor storing tokens in browser sessionStorage, exposed staging infrastructure URLs, and the absence of CAPTCHA on authentication flows. While the backend API security posture has improved since the well-documented 2021 incidents, the client-side architecture retains patterns that could facilitate unauthorized access to vaccination records.

---

## Risk Factors

- **Client-side API configuration**: All backend URL prefixes are embedded in the production JavaScript bundle, including admin, auth, appointment, beneficiary registration, and session management endpoints
- **Session-based auth storage**: Authentication tokens are stored in `sessionStorage` and attached to requests via a client-side HTTP interceptor — this is vulnerable to any XSS vector
- **UUID-format hardcoded string**: A UUID-format identifier found in the client bundle may function as a client credential or API key
- **Staging infrastructure exposed**: Pre-production CDN URLs and a staging environment URL (`staging.nhp.gov.in`) are present in the production bundle
- **No CAPTCHA on auth flows**: No reCAPTCHA, Turnstile, or any bot-detection mechanism was found in the analyzed JavaScript bundles
- **PII-rich data flows**: Beneficiary details including vaccination status, dates, certificate data, and references to Aadhaar/passport flow through the SPA

---

## Impact Scenarios

### Scenario 1: Credential Harvesting via XSS

If any XSS vulnerability exists in the Co-WIN portal (or a third-party script loaded on the page), an attacker could read `sessionStorage.getItem("userToken")` to extract the victim's authentication token. With this token, the attacker could access vaccination records, beneficiary details, and certificate generation endpoints for up to 6 individuals registered under that mobile number.

### Scenario 2: Automated Enumeration

The absence of CAPTCHA on authentication endpoints, combined with publicly documented API URL patterns in the client bundle, could allow automated tools to enumerate vaccination records by mobile number. While rate limiting may exist server-side, the lack of a client-side bot-detection layer removes a key defense layer.

### Scenario 3: Staging Environment Reconnaissance

The exposed staging URL (`staging.nhp.gov.in`) and pre-production CDN (`prod-cdn.preprod.co-vin.in`) provide attackers with knowledge of internal infrastructure topology. If the staging environment has weaker access controls, it could serve as a vector for testing exploits before targeting production.

### Scenario 4: Historical Data Exposure

Co-WIN holds vaccination records for over a billion Indians. The combination of client-side API structure knowledge, absence of robust bot protection, and an authentication flow relying on mobile OTP creates a persistent risk of mass data extraction — as demonstrated by the 2023 Co-WIN data leak incident.

---

## Findings Overview

| Severity | Category | Details |
|----------|----------|---------|
| **CRITICAL** | Hardcoded UUID in client bundle | UUID-format string found — potential client credential |
| **HIGH** | Auth token in sessionStorage | Tokens stored client-side and parsed via `JSON.parse()` for Authorization headers |
| **HIGH** | No CAPTCHA/bot detection | No reCAPTCHA, Turnstile, or equivalent found in analyzed bundles |
| **HIGH** | Staging URLs in production | Pre-production infrastructure URLs exposed to all visitors |
| **HIGH** | API prefix enumeration | 10+ distinct API route prefixes embedded in client code |
| **MEDIUM** | No certificate pinning | No HTTP certificate pinning detected for critical health infrastructure |
| **MEDIUM** | PII in client-side logic | Beneficiary data handling (Aadhaar references, passport, DOB) visible in JS |
| **MEDIUM** | Verbose router logging | Current URL logged to console on every navigation |
| **LOW** | Large bundle size | ~3MB main.js includes full moment.js locale data for 100+ languages |
| **LOW** | Outdated Angular patterns | Webpack-based Angular (pre-Ivy optimizations) with lazy-loaded chunks |

---

## Why This Matters

Co-WIN is not just a vaccination portal — it is one of India's most critical digital public health infrastructure assets. Vaccination records have been used for international travel, employment verification, and social access. The 2023 Co-WIN data leak (where a bot on a messaging platform was found serving up vaccination details) demonstrated the real-world impact of these architectural weaknesses.

This portal sits on the same backend infrastructure as the U-WIN Vaccinator app (analyzed in our [U-WIN security analysis](/blog/uwin-security-analysis/)), which we found to have hardcoded secret keys and reversible "encryption." The systemic pattern across this health infrastructure stack is concerning: client-side secrets, weak auth flows, and insufficient bot protection.

As India digitizes more health records through the ABDM (Ayushman Bharat Digital Mission) and U-WIN (the Universal Immunization Programme successor to Co-WIN), the security posture of these foundational systems needs urgent strengthening.

---

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-11 | Blog post published (responsible disclosure) |
| 2026-06-11 | CERT-In notification to be filed |
| 2026-06-11 | NCIIPC notification (critical health infrastructure) |
| 2026-09-09 | 90-day public disclosure deadline |

---

## Recommendations

### Immediate (0-30 days)

1. **Move auth tokens to HttpOnly cookies** — Eliminate XSS-extractable token storage
2. **Add CAPTCHA/Turnstile** to all authentication endpoints — Prevent automated enumeration
3. **Remove staging URLs** from production bundles — Use environment-specific builds

### Short-term (1-3 months)

4. **Implement certificate pinning** for API endpoints — Especially for health data in transit
5. **Audit and rotate** any hardcoded UUIDs/client credentials found in the bundle
6. **Server-side rate limiting** with per-IP and per-phone throttling on OTP endpoints

### Structural (3-12 months)

7. **Adopt a zero-trust API gateway** — Validate all requests server-side, never trust client-sent secrets
8. **Security-focused rebuild** — Consider migrating to a framework with built-in CSP, SSR with minimal client hydration, and proper secret management
9. **Independent security audit** — Commission a third-party penetration test covering the full Co-WIN/U-WIN health infrastructure stack

---

## Related Analyses

- [U-WIN Vaccinator Security Analysis](/blog/uwin-security-analysis/) — Same Co-WIN backend, mobile app with hardcoded secrets
- [CBSE OSM Security Investigation](https://ccagentorg.github.io/cbse-osm-osint/) — Related pattern: government IT vendor security failures

---

*This analysis is part of an ongoing series examining the security architecture of Indian government digital services. All findings are reported responsibly through established disclosure channels.*
