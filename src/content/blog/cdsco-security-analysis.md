---
title: "CDSCO Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of CDSCO (MoHFW) reveals SHA-1 password hashing on the drug regulatory portal, missing security headers on the online service, and developer information exposure."
publishDate: 2026-06-07
tags: ["security", "responsible-disclosure", "india-gov", "health"]
draft: false
---

# CDSCO: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | CDSCO (Central Drugs Standard Control Organisation) |
| **Ministry/Body** | MoHFW |
| **Data Category** | Drug Licenses & Clinical Trials |
| **Sensitivity** | 🟡 Medium |
| **Platform** | Web (OpenCMS + Java Servlet) |
| **Analysis Date** | 2026-06-07 |
| **Critical** | 1 |
| **High** | 2 |
| **Medium** | 4 |
| **Low** | 2 |

## Summary

India's drug regulatory authority, CDSCO — which approves medicines, licenses drug manufacturers, and oversees clinical trials — uses **SHA-1 for client-side password hashing** on its online portal (cdscoonline.gov.in). The service portal has **no Content Security Policy, no HSTS, and no Secure/SameSite flags on its session cookie**. The main information portal (cdsco.gov.in) is well-secured with OpenCMS, but the actual service portal where drug applications are submitted runs on a separate infrastructure with dramatically weaker security.

## Risk Factors

- **SHA-1 password hashing**: The login form uses CryptoJS SHA-1 for client-side password hashing. SHA-1 is deprecated by NIST and broken since 2017.
- **No Secure flag on session cookie**: The `JSESSIONID` cookie lacks the `Secure` flag, allowing it to be transmitted over unencrypted HTTP.
- **No SameSite on session cookie**: Missing `SameSite` attribute enables cross-site request forgery.
- **No CSP or HSTS on service portal**: cdscoonline.gov.in has no Content-Security-Policy or Strict-Transport-Security headers.
- **Malformed X-Frame-Options**: The header contains a URL (`centraldashboard-chi.nhp.gov.in`) instead of `DENY` or `SAMEORIGIN`, making it ineffective.
- **Developer information in source**: HTML comments contain developer names who added specific code sections.

## Impact Scenarios

### Scenario 1: Drug Application Tampering
A pharmaceutical company employee's session on cdscoonline.gov.in could be hijacked due to the missing Secure and SameSite cookie flags. An attacker on the same network could capture the session cookie and submit or modify drug registration applications — potentially approving a drug that hasn't been properly reviewed or inserting falsified clinical trial data.

### Scenario 2: Password Hash Reuse
The SHA-1 hash of `password + username` (double-hashed with a token) is sent to the server as the authenticator. If the server stores this hash directly, a database breach would expose SHA-1 hashes that could be cracked rapidly using modern GPUs. SHA-1 hashes can be computed at rates exceeding 10 billion per second on commodity hardware.

### Scenario 3: Cross-Site Scripting via Missing CSP
Without a Content-Security-Policy, any reflected or stored XSS vulnerability in the CDSCO portal would be exploitable without restriction. Given that the portal handles drug applications with rich text fields and file uploads, XSS vectors are plausible.

## Findings Overview

| # | Severity | Category | Finding |
|---|----------|----------|---------|
| 1 | 🔴 Critical | Cryptography | SHA-1 used for client-side password hashing (`CryptoJS.SHA1()`) |
| 2 | 🟠 High | Session Management | JSESSIONID without Secure or SameSite flags |
| 3 | 🟠 High | Missing Headers | No CSP and no HSTS on cdscoonline.gov.in service portal |
| 4 | 🟡 Medium | Header Misconfiguration | X-Frame-Options contains URL instead of DENY/SAMEORIGIN |
| 5 | 🟡 Medium | Third-party Tracking | Google Analytics (GA4) on drug regulatory portal |
| 6 | 🟡 Medium | Information Disclosure | Developer names in HTML comments ("Added by Arjit Saxena") |
| 7 | 🟡 Medium | Mixed Content | HTTP link to cdsco.nic.in on HTTPS page |
| 8 | 🟢 Low | Stale Content | Redirect page Last-Modified: March 2021 |

### Positive Findings

The main portal (cdsco.gov.in) has excellent security posture:
- **HSTS**: `max-age=31536000; preload`
- **CSP**: `object-src=none; frame-ancestors=self`
- **Permissions-Policy**: Restrictive
- **Clear-Site-Data**: Clears cache, cookies, storage
- **SameSite=Strict** on the main portal's session cookie
- **JCaptcha** on login form for brute-force protection
- **jQuery 3.7.1** — current version

## Why This Matters

CDSCO is India's apex drug regulatory body — equivalent to the US FDA. It approves every medicine sold in India, licenses every drug manufacturer, and oversees clinical trials. The online portal (SUGAM) is where pharmaceutical companies submit applications for new drug approvals, manufacturing licenses, and clinical trial registrations.

The contrast between the **well-secured information portal** (cdsco.gov.in on OpenCMS) and the **poorly-secured service portal** (cdscoonline.gov.in on custom Java) is a common pattern in Indian government infrastructure: the public-facing website gets modern CMS with good defaults, while the actual transactional system runs on legacy custom code with minimal security headers.

SHA-1 for password hashing on a drug regulatory portal is particularly concerning because:
1. NIST deprecated SHA-1 for digital signatures in 2011
2. Google demonstrated practical SHA-1 collisions (SHAttered) in 2017
3. India's [IT Act amendments and CERT-In directives](https://www.cert-in.org.in/) require government systems to use strong cryptography

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-07 | Blog post published |
| 2026-06-07 | CERT-In notification (planned) |
| 2026-06-07 | MoHFW notification (planned) |
| 2026-09-05 | 90-day disclosure deadline |

## Recommendations

### Immediate (0-30 days)
- **Replace SHA-1 with bcrypt/argon2**: Server-side password hashing. Remove CryptoJS SHA-1 from client-side entirely.
- **Fix session cookie**: Add `Secure` and `SameSite=Strict` to JSESSIONID on cdscoonline.gov.in.
- **Add HSTS**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

### Short-term (30-90 days)
- **Add CSP**: Implement a strict Content-Security-Policy on cdscoonline.gov.in.
- **Fix X-Frame-Options**: Change from URL to `SAMEORIGIN`.
- **Remove developer names**: Strip HTML comments containing developer identities.

### Structural (90+ days)
- **Unify security posture**: Bring cdscoonline.gov.in up to the same standard as cdsco.gov.in.
- **Security audit**: Commission a penetration test covering the SUGAM application, drug approval workflows, and file upload handling.
- **API security**: Review all REST endpoints on cdscoonline.gov.in for authentication and authorization.

---

*Part of the [Indian Government Portal Security Audit](/blog/) series. See the [dashboard](https://cashlessconsumer.zo.space/govt-security-audit) for progress.*
