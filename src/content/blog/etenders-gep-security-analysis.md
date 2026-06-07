---
title: "eTenders (GeP) Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of eTenders Government eProcurement System (MeitY) reveals MD5 password hashing, outdated framework, and session management weaknesses that could expose procurement data of Indian government contracts."
publishDate: 2026-06-07
tags: ["security", "responsible-disclosure", "india-gov", "procurement"]
draft: false
---

# eTenders (GeP): Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | eTenders (Government eProcurement System) |
| **Ministry/Body** | MeitY / NIC |
| **Data Category** | Procurement & Financial Bids |
| **Sensitivity** | 🟡 Medium |
| **Platform** | Web (Apache Tapestry + Java Servlets) |
| **Analysis Date** | 2026-06-07 |
| **Critical** | 1 |
| **High** | 3 |
| **Medium** | 3 |
| **Low** | 2 |

## Summary

The Government eProcurement System (GeP) at etenders.gov.in — India's central portal for publishing and bidding on government tenders — uses **MD5 for client-side password hashing**, runs on an **outdated Apache Tapestry framework from 2007-2008**, and has **weak Content Security Policy** and **insecure session cookie configuration**. While the portal has some positive security measures (HSTS with preload, X-Frame-Options), the core authentication architecture relies on a cryptographically broken hash function visible in client-side JavaScript, and the entire technology stack appears to be largely unmaintained since at least 2021.

## Risk Factors

- **MD5 password hashing**: Client-side JavaScript implements password "encryption" using `hex_md5()` — a pure JavaScript MD5 implementation. MD5 has been cryptographically broken since 2004.
- **Outdated framework**: The application runs Apache Tapestry 4 with Dojo toolkit revision 618461 (~2007-2008 vintage). These frameworks have known vulnerabilities and receive no security patches.
- **Insecure session cookie**: The `JSESSIONID` cookie is set with `SameSite=None`, making it vulnerable to cross-site request forgery.
- **Weak CSP**: Content Security Policy includes `unsafe-inline`, `unsafe-eval`, and `data:` in the default-src directive — functionally equivalent to having no script injection protection.
- **External domain in CSP**: The CSP references `niccicms.raj.nic.in` (Rajasthan NIC CMS), suggesting the portal shares resources with a state-level system.
- **Serialized state in HTML**: Tapestry embeds gzipped, base64-encoded serialized Java objects in hidden form fields, creating potential deserialization attack surface.

## Impact Scenarios

### Scenario 1: Bid Manipulation via Session Hijacking
A government contractor operating on a shared network could have their `JSESSIONID` cookie intercepted due to `SameSite=None`. With a valid session, an attacker could submit or withdraw bids on behalf of the contractor, potentially altering the outcome of a ₹500 crore infrastructure tender. The 20-minute session timeout window (revealed by the application's error messages) provides a generous attack window.

### Scenario 2: Password Hash Reuse Across Government Portals
Since the portal uses MD5 to hash passwords client-side, the MD5 hash effectively *becomes* the password transmitted to the server. If a user reuses their password across multiple government portals, and one portal's database is compromised, the MD5 hash from that breach can be directly replayed against eTenders without needing to crack the original password.

### Scenario 3: Supply Chain via Deserialization
The `seedids` hidden fields in every Tapestry form contain serialized Java objects. If the server-side deserialization logic has vulnerabilities (a well-known class of Java exploits), an attacker could craft a modified serialized object to execute arbitrary code on the server — the same class of vulnerability that compromised numerous Java applications globally.

## Findings Overview

| # | Severity | Category | Finding |
|---|----------|----------|---------|
| 1 | 🔴 Critical | Client-side MD5 hashing | Password hashing uses MD5 via `hex_md5()` in JavaScript — broken since 2004 |
| 2 | 🟠 High | Session Management | `JSESSIONID` cookie with `SameSite=None` enables CSRF |
| 3 | 🟠 High | Content Security Policy | `unsafe-inline`, `unsafe-eval`, `data:` in default-src — no XSS protection |
| 4 | 🟠 High | Outdated Framework | Apache Tapestry 4 + Dojo 0.x (2007-2008) — no security patches available |
| 5 | 🟡 Medium | Information Disclosure | Error page reveals session timeout (20 min) and IP binding implementation |
| 6 | 🟡 Medium | Deserialization Surface | Serialized Java objects in HTML hidden fields (`seedids`) |
| 7 | 🟡 Medium | External CSP Domain | `niccicms.raj.nic.in` (Rajasthan NIC CMS) in CSP `default-src` |
| 8 | 🟢 Low | Stale Content | Homepage `Last-Modified` header: July 2021 — suggests minimal maintenance |
| 9 | 🟢 Low | Security Theater | Client-side keyboard blocking (Ctrl+N, Ctrl+T) provides no real security |

### Positive Findings

The portal does have several positive security measures:
- **HSTS**: Strict-Transport-Security with `max-age=63072000; includeSubDomains; preload` — excellent configuration
- **X-Frame-Options**: `SAMEORIGIN` — prevents clickjacking
- **X-Content-Type-Options**: `nosniff` — prevents MIME sniffing
- **Referrer-Policy**: `strict-origin-when-cross-origin` — good privacy practice
- **Permissions-Policy**: Restricts accelerometer, camera, geolocation, microphone, etc.
- **Captcha**: Present on search forms for rate limiting

## Why This Matters

eTenders/GeP handles **government procurement worth thousands of crores annually**. Every government department uses this portal to publish tenders and receive bids. The integrity of the bidding process depends on the security of this system.

The use of MD5 for password hashing is particularly concerning because:
1. It suggests the codebase has not undergone a security audit since at least the mid-2000s
2. The `encryptShaPwd()` function using SHA-512 exists alongside `encryptPwd()` — indicating an incomplete migration
3. Client-side hashing means the hash itself becomes the authenticator, eliminating the benefit of server-side password hashing

This portal sits in the same DPI ecosystem as [UMANG](/blog/umang-security-analysis/) and [MyGov](/blog/mygov-security-analysis/), and shares NIC infrastructure with other government services. Weaknesses here could cascade to other platforms if users share credentials.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-07 | Blog post published |
| 2026-06-07 | CERT-In notification (planned) |
| 2026-06-07 | NCIIPC notification (planned) |
| 2026-09-05 | 90-day disclosure deadline |

## Recommendations

### Immediate (0-30 days)
- **Replace MD5 with bcrypt/argon2**: Server-side password hashing using modern algorithms. Remove `encryptPwd()` from client-side JS entirely — hashing should happen only on the server.
- **Fix session cookie**: Set `SameSite=Strict` or `SameSite=Lax` on `JSESSIONID`.
- **Fix CSP**: Remove `unsafe-inline` and `unsafe-eval`. Use nonce-based CSP.

### Short-term (30-90 days)
- **Framework upgrade**: Migrate from Apache Tapestry 4 to a modern, maintained framework. Tapestry 4 reached EOL over a decade ago.
- **Remove serialized state from HTML**: Replace Tapestry's client-side state persistence with server-side session storage.
- **Remove external CSP domain**: Remove `niccicms.raj.nic.in` from CSP unless absolutely necessary.

### Structural (90+ days)
- **Security audit**: Commission a full penetration test covering authentication, authorization, and business logic.
- **Monitoring**: Implement security logging and anomaly detection for bid submissions.
- **Bug bounty**: Consider a vulnerability disclosure program given the financial sensitivity of procurement data.

---

*Part of the [Indian Government Portal Security Audit](/blog/) series. See the [dashboard](https://cashlessconsumer.zo.space/govt-security-audit) for progress.*
