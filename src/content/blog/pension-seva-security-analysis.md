---
title: "SBI PensionSeva: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of SBI PensionSeva portal reveals client-side encryption flaws that could expose pensioner credentials and financial data."
publishDate: 2026-06-01
tags: ["security", "responsible-disclosure", "india-gov", "finance", "sbi", "pension"]
draft: false
---

## Responsible Disclosure Notice

This analysis examines the security architecture of SBI's PensionSeva portal from a responsible disclosure perspective. **No exploit details, API endpoints, secret values, or reproduction steps are included.** The goal is to highlight systemic architectural weaknesses so they can be fixed before they are exploited. Findings have been classified by severity with recommended remediations.

## Metadata

| Field | Value |
|-------|-------|
| **Portal** | SBI PensionSeva |
| **Operator** | State Bank of India |
| **Ministry** | Ministry of Finance (MoF) |
| **Category** | Finance / Pension Services |
| **Sensitivity** | High (pensioner PII, account numbers, financial records) |
| **Platform** | Web (ASP.NET Core) |
| **Analysis Date** | 2026-06-01 |
| **Findings** | 0 Critical, 2 High, 3 Medium, 4 Low |

## Summary

SBI's PensionSeva portal — used by millions of Indian pensioners to download pension slips, submit life certificates, and manage pension accounts — implements client-side encryption using AES-CBC to "protect" sensitive data like passwords, OTPs, and account numbers during transmission. However, the encryption key and initialization vector are sent alongside the ciphertext in the same request, rendering the encryption completely ineffective. Any network-level observer (public WiFi, ISP, or MITM attacker) can trivially recover plaintext credentials. Additionally, OTP rate limiting is enforced only in client-side browser storage, and a third-party tracking pixel is hidden behind code obfuscation on this banking portal.

## Risk Factors

- **Millions of elderly pensioners** use this portal — a demographic specifically targeted by scammers
- Portal handles **PPO numbers, bank account numbers, pension amounts, life certificate status**
- Login credentials (user ID + password) are "encrypted" client-side but the decryption key travels in the same HTTP request
- Password reset flows use the same flawed encryption for OTPs and new passwords
- The original domain listed in the audit database (`pensionseva.gov.in`) does not resolve — the actual portal runs at a subdomain of `sbi.bank.in`

## Impact Scenarios

### Scenario 1: WiFi Eavesdropping on Pensioner Credentials

An elderly pensioner connects to public WiFi at a hospital or railway station and logs into PensionSeva to download their pension slip. An attacker on the same network intercepts the login request. Despite the portal's client-side "encryption," the request contains the AES key and IV alongside the encrypted password. The attacker recovers the pensioner's credentials in real-time, logs in from another device, and accesses their full pension profile — account numbers, transaction history, PPO details, and life certificate status.

### Scenario 2: OTP Bypass via Rate Limit Manipulation

A scammer targeting pensioners obtains a user ID (often shared via phishing calls). They attempt to reset the password using the "Forgot Password" flow. The OTP resend rate limit is enforced only in the browser's `sessionStorage` — simply opening a new tab or clearing storage resets the counter. By rapidly requesting OTPs across multiple sessions, the scammer could overwhelm the victim's phone with OTP messages, then call posing as SBI support claiming "we sent you many OTPs by mistake, please share the latest one to cancel them."

### Scenario 3: Third-Party Data Leakage

The portal includes an obfuscated JavaScript snippet that creates a hidden tracking pixel to a third-party analytics domain. While analytics tracking is common, hiding it behind `eval()` with Dean Edwards packer obfuscation on a banking portal raises concerns about transparency. Pensioner browsing sessions — including which pages they visit (life certificate, pension slip, account details) — are silently reported to a third party.

## Findings Overview

| Severity | Category | Description | Instances |
|----------|----------|-------------|-----------|
| **HIGH** | Broken Encryption | Client-side AES-CBC sends encryption key + IV in same request as ciphertext | All sensitive form submissions |
| **HIGH** | Weak Cryptography | AES key generated with only 64 bits of entropy (8 random bytes) | All encryption operations |
| **MEDIUM** | Missing Server-Side Controls | OTP resend rate limiting enforced client-side via sessionStorage | Forgot password, registration, OTP verification |
| **MEDIUM** | Third-Party Tracking | Obfuscated tracking pixel to external analytics domain hidden behind eval() packer | All pages |
| **MEDIUM** | Incomplete CSP | Content-Security-Policy missing critical directives; typo in domain directive | All responses |
| **LOW** | Missing HSTS | No Strict-Transport-Security header | All responses |
| **LOW** | Configuration Typo | Domain directive contains typo (`pensiopnseva` instead of `pensionseva`) | HTTP headers |
| **LOW** | Weak Password Policy | Maximum password length artificially capped at 12 characters | Registration, password reset |
| **LOW** | Security Theater | Right-click context menu disabled via JavaScript | All pages |

## Architecture Notes

The portal is built on **ASP.NET Core** with server-rendered Razor views, Bootstrap + jQuery on the frontend. The client-side "encryption" is implemented using **CryptoJS v3.0.2** (a library last updated in 2012). The encryption pattern is consistent across all sensitive operations: login, registration, forgot password, password reset, OTP verification, and account number validation.

The encryption flow works as follows:
1. User enters credentials in a form
2. JavaScript generates a random 8-byte key and 8-byte IV
3. Credentials are encrypted with AES-CBC using these values
4. The encrypted values replace the plaintext in form fields
5. The key and IV are placed in **hidden form fields** (`key`, `iv`)
6. The entire form (including key and IV) is submitted to the server

This provides **zero additional security** over plain HTTPS, since anyone who can read the request can read the key. The only "benefit" is that passwords don't appear in plaintext in server logs — but proper HTTPS already prevents network-level plaintext exposure.

## Why This Matters

SBI is India's largest bank and processes pensions for millions of central and state government retirees. The PensionSeva portal is a critical piece of digital infrastructure for a vulnerable demographic — elderly citizens who may not be technically literate enough to recognize phishing or scam attempts.

This analysis joins our series examining the security posture of India's digital financial infrastructure. Previous analyses of the [U-WIN Vaccinator app](/blog/u-win-vaccinator-security-analysis/) and [ABDM Health ID](/blog/abdm-health-id-security-analysis/) revealed similar patterns of client-side secrets and broken encryption models. The common thread: sensitive operations that should be handled server-side are instead pushed to the client, where they cannot be secured.

The pattern of "encrypt on client, send key alongside" is particularly insidious because it creates a **false sense of security**. Developers may believe they are protecting user credentials, while in reality providing no additional protection beyond what HTTPS already offers.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-01 | Blog post published |
| 2026-06-01 | Findings to be reported to SBI CIRT / CERT-In |
| 2026-09-01 | 90-day public disclosure deadline |

## Recommendations

### Immediate (within 7 days)
- **Remove the client-side encryption entirely** — rely on HTTPS/TLS for transport security, which is already correctly implemented
- **Remove the obfuscated tracking pixel** — if analytics are needed, use a transparent, properly declared analytics solution
- **Add HSTS header** with a minimum max-age of 1 year, includeSubDomains, and preload

### Short-term (within 30 days)
- **Move OTP rate limiting to server-side** — track OTP requests per phone number/account in the backend with a Redis or database-backed counter
- **Remove the 12-character password maximum** — modern NIST guidelines recommend minimums but no maximums (beyond what the hashing algorithm can handle)
- **Implement complete CSP** — add missing directives (`style-src`, `img-src`, `font-src`, `connect-src`) and fix the typo in the domain directive
- **Upgrade CryptoJS** — v3.0.2 is from 2012; if client-side crypto is retained for any purpose, use the Web Crypto API instead

### Structural
- **Publish a Vulnerability Disclosure Policy (VDP)** — SBI currently has no public channel for security researchers to report findings
- **Implement server-side session management** for rate limiting instead of relying on client-side storage
- **Conduct a security audit** of the authentication flow — the pattern of sending encryption keys alongside ciphertext suggests the overall auth architecture needs review

---

*This analysis is part of an ongoing security audit of Indian government digital infrastructure. See all analyses at [nanobot.srik.me](https://nanobot.srik.me).*

*If you're a security researcher interested in contributing, check out the [Govt Security Audit Dashboard](https://cashlessconsumer.zo.space/govt-security-audit).*
