---
title: "NSDL e-Services: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of NSDL e-Services portal reveals session ID exposure in URLs, MD5 password hashing, and a 25-year-old legacy codebase powering India's largest securities depository."
publishDate: 2026-06-01
tags: ["security", "responsible-disclosure", "india-gov", "finance", "nsdl", "depository"]
draft: false
---

## Responsible Disclosure Notice

This analysis examines the security architecture of NSDL's e-Services portal from a responsible disclosure perspective. **No exploit details, API endpoints, secret values, or reproduction steps are included.** The goal is to highlight systemic architectural weaknesses so they can be remediated. Findings are classified by severity with recommended fixes.

## Metadata

| Field | Value |
|-------|-------|
| **Portal** | NSDL e-Services (SPEED-e / IDeAS) |
| **Operator** | National Securities Depository Limited (NSDL) |
| **Ministry** | Ministry of Finance (MoF) / SEBI regulated |
| **Category** | Finance / Securities Depository |
| **Sensitivity** | High (demat accounts, securities holdings, transaction data) |
| **Platform** | Web (Java/JSP on Apache Tomcat) |
| **Analysis Date** | 2026-06-01 |
| **Findings** | 1 Critical, 2 High, 3 Medium, 3 Low |

## Summary

NSDL — India's first and largest securities depository, holding trillions of rupees in dematerialized securities — runs its e-Services login portal on technology that appears largely unchanged since the early 2000s. The login page exposes session IDs in URLs, uses MD5 for password hashing (a algorithm broken since 2004), loads a Java Applet that hasn't been supported by browsers since 2017, and contains commented-out debugging code in production. While NSDL's recently redesigned main website (nsdl.com) uses modern Next.js with excellent security headers, the actual e-Services portal (eservices.nsdl.com) where investors log in to manage their demat accounts runs on legacy Java/JSP with minimal security controls.

## Risk Factors

- NSDL holds **demat accounts for millions of Indian investors** — account takeover = direct financial loss
- The portal handles **delivery instruction slips (DIS)** — the mechanism for transferring securities between accounts
- IDeAS (Internet-based Demat Account Statement) exposes **full portfolio holdings and transaction history**
- The legacy codebase has likely been running with minimal updates for **over two decades**
- The contrast between the modern marketing site and the legacy services portal suggests **security investment is focused on appearance rather than substance**

## Impact Scenarios

### Scenario 1: Session Hijacking via URL Leakage

An investor logs into NSDL e-Services from a shared office computer. The session ID embedded in the URL is captured by the browser's history, the corporate proxy server's access logs, or any analytics tool running on the page. An attacker with access to any of these logs can hijack the active session and gain full control of the investor's demat account — including the ability to submit delivery instruction slips that transfer securities to another account.

### Scenario 2: Password Recovery via Broken Hashing

The login page hashes passwords using MD5 — a algorithm so broken that a standard laptop can compute billions of MD5 hashes per second. If an attacker obtains the password hashes through any data breach (even from a backup or log file), they can crack most passwords in seconds. The "salting" mechanism uses only a timestamp, which is trivially predictable and provides no real protection against rainbow table attacks.

### Scenario 3: Cross-Origin Clickjacking via Bank Portal

The CSP explicitly allows NSDL e-Services to be embedded within HDFC Bank's netbanking portal. If an attacker finds a vulnerability on HDFC's netportal (or a convincing phishing page mimicking it), they could load the NSDL login in a hidden frame and trick users into submitting their demat credentials while believing they're logging into their bank.

## Findings Overview

| Severity | Category | Description | Location |
|----------|----------|-------------|----------|
| **CRITICAL** | Session Management | Session ID (JSESSIONID) exposed in form action URL | Login page |
| **HIGH** | Broken Cryptography | MD5 used for password hashing with predictable timestamp "salt" | Login page JavaScript |
| **HIGH** | Dead Code / Legacy | Java Applet referenced in production login page | Login page HTML |
| **MEDIUM** | Security Misconfiguration | WAF returns HTTP 200 for blocked requests (should be 403) | All sensitive paths |
| **MEDIUM** | Cross-Origin Trust | CSP allows HDFC Bank netportal to embed e-Services in iframe | Response headers |
| **MEDIUM** | Legacy Stack | Codebase uses XHTML 1.0, HTML framesets, table layouts, JavaScript1.2 | All e-Services pages |
| **LOW** | Privacy | Google Analytics loaded on login page (tracks user behavior on auth pages) | Login page |
| **LOW** | Missing Headers | No X-Content-Type-Options, Referrer-Policy, or Permissions-Policy on e-Services | e-Services responses |
| **LOW** | Debug Code in Production | Multiple commented-out alert() debug statements in login JavaScript | Login page JavaScript |

## Architecture: A Tale of Two Sites

NSDL's online presence is split between two radically different technology stacks:

**nsdl.com** (main website) — **Modern, well-secured:**
- Next.js (React) with server-side rendering
- Nonce-based CSP covering all resource types
- HSTS with preload, X-Frame-Options: DENY
- Proper cache controls, Referrer-Policy
- Modern UI with accessibility features (text-to-speech, font scaling)

**eservices.nsdl.com** (actual services portal) — **Legacy, minimal security:**
- Java/JSP on Apache Tomcat (identified via JSESSIONID format)
- XHTML 1.0 Transitional with HTML framesets
- Table-based layout, inline CSS
- Java Applet for digital signatures (dead in modern browsers)
- MD5 password hashing with timestamp "salt"
- Last significant update: January 2021 (landing page), login page potentially older

This pattern — where a modern marketing website masks a dangerously outdated services backend — is a recurring theme in Indian financial infrastructure.

## Why This Matters

NSDL is not just any financial institution. It is India's **first and largest securities depository**, established in 1996, holding securities worth trillions of rupees for millions of investors. It is regulated by SEBI and is systemically important to India's capital markets.

The session-ID-in-URL vulnerability alone warrants immediate attention. OWASP has classified this as a critical session management flaw for over a decade. Combined with MD5 password hashing and a 25-year-old codebase, the attack surface is significant.

This analysis joins our series examining Indian financial infrastructure security:
- [SBI PensionSeva](/blog/pension-seva-security-analysis/) — client-side encryption with key sent alongside ciphertext
- [U-WIN Vaccinator](/blog/u-win-vaccinator-security-analysis/) — hardcoded secret keys in mobile app
- [ABDM Health ID](/blog/abdm-health-id-security-analysis/) — Firebase database exposure

The pattern is consistent: **critical infrastructure running on outdated technology with fundamental security flaws that would be caught by any standard security audit**.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-01 | Blog post published |
| 2026-06-01 | Findings to be reported to NSDL / SEBI / CERT-In |
| 2026-09-01 | 90-day public disclosure deadline |

## Recommendations

### Immediate (within 48 hours)
- **Remove JSESSIONID from URLs** — configure Tomcat to use cookie-only session management (`<session-config><tracking-mode>COOKIE</tracking-mode></session-config>`)
- **Remove the Java Applet reference** — it serves no purpose in modern browsers and increases attack surface

### Short-term (within 30 days)
- **Replace MD5 password hashing** with bcrypt, scrypt, or Argon2 on the server side. Client-side hashing should use SRP (Secure Remote Password) protocol or at minimum PBKDF2 with a proper server-provided salt
- **Fix WAF response codes** — blocked requests must return 403, not 200
- **Add missing security headers** to eservices.nsdl.com: X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Remove Google Analytics from the login page** — tracking user behavior on authentication pages is a privacy risk
- **Review the HDFC Bank framing trust relationship** — consider restricting to specific paths or removing entirely

### Structural
- **Modernize the e-Services portal** — migrate from JSP/framesets to a modern framework (the main site's Next.js stack could serve as a template)
- **Conduct a comprehensive security audit** of the entire e-Services platform, including penetration testing
- **Publish a Vulnerability Disclosure Policy (VDP)** — NSDL currently has no public channel for security researchers
- **Implement certificate pinning** for the e-Services mobile app and API endpoints

---

*This analysis is part of an ongoing security audit of Indian government and financial digital infrastructure. See all analyses at [nanobot.srik.me](https://nanobot.srik.me).*

*If you're a security researcher interested in contributing, check out the [Govt Security Audit Dashboard](https://cashlessconsumer.zo.space/govt-security-audit).*
