---
title: "Kisan Call Center (DAC KKMS): Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of the Kisan Call Center portal (MoA) reveals MD5 password hashing, missing security headers, and no HTTPS enforcement — putting farmer call center operator credentials at risk."
publishDate: 2026-06-08
tags: ["security", "responsible-disclosure", "india-gov", "agriculture", "aspnet"]
draft: false
---

## Responsible Disclosure Notice

This analysis examines the **security architecture** of the Kisan Call Center portal operated by the Department of Agriculture and Farmers Welfare, Ministry of Agriculture. No exploit details, API endpoints, secrets, or reproduction steps are included. Findings are reported through responsible disclosure channels.

## Metadata

| Field | Value |
|-------|-------|
| **Portal** | Kisan Call Center (DAC KKMS) |
| **Ministry** | Ministry of Agriculture (MoA) |
| **Category** | Utility — Farmer Support Infrastructure |
| **Platform** | Web (ASP.NET on IIS 10.0) |
| **Sensitivity** | Low (call center operator accounts) |
| **Analysis Date** | 2026-06-08 |
| **Findings** | 1 Critical, 2 High, 2 Medium, 2 Low |

## Summary

The Kisan Call Center Knowledge Management System (DAC KKMS) is the central portal for India's nationwide farmer helpline (toll-free 1800-180-1551), used by call center operators and farm telecommunications agents across 14 locations. The portal uses **MD5 for client-side password hashing** — a cryptographic algorithm broken since 2004 — and transmits credentials over connections without modern security headers. The portal also fails to enforce HTTPS, allowing credentials to be intercepted on unencrypted HTTP connections.

## Risk Factors

- **MD5 password hashing** on both login and registration pages — passwords are hashed with `hex_md5()` before submission, meaning the server stores MD5 hashes (or double-MD5 with a nonce). MD5 collisions are trivially generated; rainbow tables for MD5 are pre-computed for billions of passwords.
- **No HTTPS enforcement** — the HTTP version of the portal redirects to the login page (not to HTTPS), meaning credentials could be submitted over plaintext connections on networks that don't auto-upgrade.
- **Zero security headers** — no HSTS, CSP, X-Frame-Options, X-Content-Type-Options, or Referrer-Policy. The portal is vulnerable to clickjacking, MIME-sniffing, and protocol downgrade attacks.
- **Server version disclosure** — `Microsoft-IIS/10.0` and `X-Powered-By: ASP.NET` are broadcast in every response, enabling targeted attacks against known IIS/ASP.NET vulnerabilities.
- **Session cookie without Secure flag** — `ASP.NET_SessionId` uses `HttpOnly` and `SameSite=Lax` but lacks the `Secure` flag, allowing session hijacking over HTTP.
- **Outdated jQuery** (3.3.1, released 2018) — multiple CVEs patched in later versions.

## Impact Scenarios

### Scenario 1: Credential Harvesting via Network Interception

A farmer calls the Kisan Call Center from a rural area. The call center operator logs into DAC KKMS over a WiFi network at a KCC location. An attacker on the same network captures the HTTP traffic. Because the portal does not enforce HTTPS (the HTTP version serves the login form without redirecting to HTTPS), the attacker intercepts the MD5-hashed password. Since MD5 is fast to compute, the attacker cracks the hash offline using a GPU-accelerated tool in seconds, gaining access to the operator's account and any farmer data the operator can view.

### Scenario 2: Account Takeover via Clickjacking

Since no `X-Frame-Options` or `Content-Security-Policy` header is set, an attacker embeds the DAC KKMS portal in a hidden iframe on a malicious page. The attacker tricks a call center operator into clicking what appears to be a benign element, which actually triggers actions within the KKMS portal (e.g., changing the operator's registered email or password). The operator is unaware that their actions are being proxied to the real portal.

### Scenario 3: SIM Swap + Credential Stuffing

Call center operator credentials (email + MD5-hashed password) are exposed in a breach of this or another government portal. Because MD5 is fast and rainbow tables exist, the plaintext passwords are recovered quickly. The attacker then attempts credential stuffing on other government portals (DigiLocker, UMANG, IRCTC) where the same email-password combination may be reused. If the operator used the same password for their personal accounts, the attacker gains access to their DigiLocker (which holds academic certificates, Aadhaar linkage, and driving license data).

## Findings Overview

| Severity | Category | Detail |
|----------|----------|--------|
| **CRITICAL** | Weak Cryptography | MD5 used for client-side password hashing on login and registration (`hex_md5()` from Paul Johnston's 1999 implementation). Double-hash scheme: `MD5(nonce + MD5(password))` — still broken because MD5 is fast and collision-prone. |
| **HIGH** | Missing Security Headers | No HSTS, CSP, X-Frame-Options, X-Content-Type-Options, or Referrer-Policy. Complete absence of browser-level protections. |
| **HIGH** | Information Disclosure | Server header reveals `Microsoft-IIS/10.0` and `X-Powered-By: ASP.NET` in every response. |
| **MEDIUM** | No HTTPS Enforcement | HTTP version does not redirect to HTTPS — redirects to `/account/login.aspx` over HTTP, allowing credential interception on non-upgrading networks. |
| **MEDIUM** | Insecure Session Cookie | `ASP.NET_SessionId` missing `Secure` flag — can be transmitted over HTTP, enabling session hijacking. |
| **LOW** | Outdated Dependencies | jQuery 3.3.1 (2018) with known CVEs. |
| **LOW** | Non-Standard SSL Certificate | Uses GoDaddy commercial certificate rather than NIC/CCA-issued certificate standard for government portals. |

## Why This Matters

The Kisan Call Center is a critical piece of India's agricultural extension infrastructure — it's the primary helpline for 140+ million Indian farmers. While the portal primarily handles call center operator accounts (not farmer accounts directly), a compromise of operator credentials could enable:

- **Misinformation campaigns**: An attacker with operator access could modify advisory content or query responses being delivered to farmers.
- **Data harvesting**: Operators may have access to farmer query databases containing phone numbers, locations, and crop information.
- **Supply chain attacks**: If operator credentials are reused across government systems (a common pattern), the breach could pivot to more sensitive agricultural databases.

This is part of a pattern seen across Indian government ASP.NET portals ([CDSCO](/blog/cdsco-security-analysis/), [eTenders GeP](/blog/etenders-gep-security-analysis/), [UP e-Sathi](/blog/up-esathi-security-analysis/)) where legacy applications from the early 2010s continue to use MD5 and lack modern security headers. The fix is straightforward: migrate password hashing to bcrypt/Argon2 on the server side, add security headers, and enforce HTTPS.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-08 | Blog post published (responsible disclosure) |
| 2026-06-08 | CERT-In notification to be sent |
| 2026-06-08 | NCIIPC notification to be sent |
| 2026-09-06 | 90-day public disclosure deadline |

## Recommendations

### Immediate (0-7 days)

- **Add security headers**: HSTS (`max-age=31536000; includeSubDomains`), X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), CSP (`default-src 'self'`), Referrer-Policy (`no-referrer`).
- **Enforce HTTPS**: Configure IIS to redirect all HTTP requests to HTTPS (301 redirect at the server level, not the application level).
- **Add `Secure` flag** to `ASP.NET_SessionId` cookie.
- **Remove server version headers**: Configure IIS to suppress `Server` and `X-Powered-By` headers.

### Short-term (1-3 months)

- **Replace MD5 with server-side bcrypt or Argon2**: Client-side hashing provides no security benefit if the server receives the hash as the authenticator. Implement server-side password hashing with a modern key derivation function.
- **Update jQuery** to the latest 3.x version.
- **Implement rate limiting** on the login endpoint to prevent brute-force attacks.

### Structural (3-6 months)

- **Migrate to a modern framework**: The application appears to be a legacy ASP.NET WebForms application. Consider migrating to ASP.NET Core with proper authentication middleware.
- **Implement multi-factor authentication** for operator accounts, given their access to farmer data.
- **Conduct a full security audit** of the registration page, which collects extensive personal information from call center operators.
