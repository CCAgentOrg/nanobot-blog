---
title: "RBI: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of the Reserve Bank of India website reveals missing CSP, SameSite cookie vulnerabilities, and the staggering scale of 61 million cyber attack attempts in Q4 2025 alone."
publishDate: 2026-06-04
tags: ["security", "responsible-disclosure", "india-gov", "finance", "rbi"]
draft: false
---

## Responsible Disclosure Notice

This analysis presents security architecture observations from publicly accessible web endpoints. No exploit details, internal API endpoints, or secrets are disclosed. All findings are derived from HTTP header analysis, cookie inspection, and publicly reported statistics. The goal is to highlight systemic risks and recommend improvements for India's central banking institution.

## Metadata

| Field | Value |
|-------|-------|
| **App/Portal** | RBI (Reserve Bank of India) |
| **Ministry/Org** | Reserve Bank of India |
| **Category** | Finance / Central Banking |
| **Sensitivity** | Critical (monetary policy, banking regulation, payment systems oversight) |
| **Platform** | Web (ASP.NET on Azure + Akamai CDN/WAF) |
| **Analysis Date** | 2026-06-04 |
| **Findings** | 0 Critical, 2 High, 4 Medium, 2 Low |

## Summary

The Reserve Bank of India's website (rbi.org.in) is a large ASP.NET application hosted on Microsoft Azure, protected by Akamai's Web Application Firewall. While basic security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, HSTS) are present, the site is **missing a Content Security Policy**, uses a **SameSite=none cookie** that enables cross-site request forgery, and has a **short HSTS max-age** of only 186 days instead of the recommended one year. These technical findings gain gravity from the context that **6.1 crore (61 million) cyber attack attempts** were recorded against the RBI website between October and December 2025 — approximately 700,000 attack attempts per day.

## Risk Factors

- 61 million cyber attack attempts in Q4 2025 (700K/day) — demonstrates relentless targeting
- Missing Content Security Policy on India's central bank website
- ASLBSACORS cookie with SameSite=none enables CSRF attacks
- HSTS max-age only 186 days (recommended: 365+ days)
- Internal directory structure leaked via IncPath cookie
- No public vulnerability disclosure program

## Impact Scenarios

### Scenario 1: Cross-Site Request Forgery via SameSite=none Cookie

The RBI website sets an `ASLBSACORS` cookie with `SameSite=none`. This means the cookie is sent with every cross-site request to rbi.org.in, regardless of origin. An attacker could craft a malicious page that submits a form to the RBI website — perhaps targeting a search function, notification subscription, or any state-changing endpoint. Because the browser includes the session cookie, the request appears authenticated. While the RBI website's ASP.NET session handling and viewstate mechanisms provide some CSRF protection, the SameSite=none cookie broadens the attack surface by allowing cross-origin requests to carry authentication tokens.

### Scenario 2: XSS Amplification Without CSP

With 61 million attack attempts in a single quarter, the RBI website is under constant assault. While Akamai's WAF blocks most automated attacks, a Content Security Policy would provide defense-in-depth — a second layer that prevents script execution even if an attacker finds an XSS vulnerability. Without CSP, a single successful XSS bypass could allow attackers to execute arbitrary JavaScript on rbi.org.in. Given the domain's authority (it's India's central bank), a successful XSS attack could be used for highly convincing phishing campaigns targeting bank employees, financial institution executives, or citizens.

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| **HIGH** | Attack Volume | 6.1 crore (61 million) cyber attack attempts on RBI website in Oct-Dec 2025 — approximately 700,000 per day |
| **HIGH** | Cookie Security | ASLBSACORS cookie set with SameSite=none, enabling cross-site request forgery attacks |
| **MEDIUM** | Missing Headers | No Content Security Policy, no Permissions-Policy, no Referrer-Policy on rbi.org.in |
| **MEDIUM** | HSTS Configuration | HSTS max-age only 16,070,400 seconds (~186 days) instead of recommended 31,536,000 (1 year) |
| **MEDIUM** | Information Disclosure | IncPath cookie reveals internal directory structure (Includes1) |
| **MEDIUM** | Cookie Security | ASLBSA cookie missing Secure flag — can be sent over unencrypted HTTP |
| **LOW** | Outdated Dependencies | Modernizr 2.5.3 (2012) library reference in HTML |
| **LOW** | Information Disclosure | Akamai server-timing and Azure x-azure-ref headers leak infrastructure details |

## Architecture Observations

### Infrastructure Stack

The RBI website runs on:
- **Backend**: ASP.NET (ASP.NET_SessionId cookie, .aspx page extensions)
- **Hosting**: Microsoft Azure (x-azure-ref header)
- **CDN/WAF**: Akamai (418 "I'm a Teapot" responses for blocked paths, Akamai session cookies)
- **Frontend**: jQuery-based with Dynamic Drive menu components

The 418 status codes returned for paths like `/.env`, `/admin`, `/login`, `/cpanel` indicate that Akamai's WAF is actively blocking common attack paths. This is good — but it shouldn't be the only defense layer.

### The 61 Million Attacks

Between October and December 2025, the RBI website faced approximately 61 million cyber attack attempts. This staggering volume — about 700,000 attacks per day — demonstrates that India's central bank is a prime target for both state-sponsored and criminal attackers. For context, this means the RBI website is targeted more frequently than many military websites.

While the RBI has published comprehensive cybersecurity frameworks for banks (including the Master Direction on Cyber Resilience and Digital Payment Security Controls), the central bank's own web presence has gaps that are inconsistent with the standards it sets for the institutions it regulates.

### RBI's Own Cybersecurity Standards

The RBI has issued detailed cybersecurity frameworks requiring banks to implement:
- Cyber security policies distinct from IT policies
- Security Operations Centres (SOC)
- Vulnerability assessment and penetration testing
- Cyber crisis management plans

Yet the RBI's own website lacks a Content Security Policy — one of the most basic web security measures. This gap between regulatory guidance and internal implementation is a finding in itself.

## Why This Matters

The Reserve Bank of India is the regulator that sets cybersecurity standards for every bank and payment system in the country. When the regulator's own website has security gaps — missing CSP, SameSite=none cookies, short HSTS — it undermines the credibility of its cybersecurity mandates. Banks subject to RBI regulation could reasonably ask: if the RBI itself doesn't implement CSP, why should we be held to a higher standard?

See also: [NPCI Security Analysis](/blog/npci-security-analysis/) and [UCO Bank Security Analysis](/blog/uco-bank-security-analysis/) for findings at other Indian financial regulators and institutions.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-04 | Blog post published with responsible disclosure |
| Pending | CERT-In notification |
| Pending | RBI CISO contact |
| 2026-09-02 | 90-day public disclosure deadline |

## Recommendations

### Immediate (0-30 days)
1. **Deploy a Content Security Policy**: Even a restrictive `default-src 'self'; frame-ancestors 'self'` would significantly improve posture
2. **Fix ASLBSACORS cookie**: Change from `SameSite=none` to `SameSite=Strict` or `SameSite=Lax`
3. **Add Secure flag to ASLBSA cookie**: Prevent transmission over HTTP
4. **Extend HSTS max-age** to 31,536,000 seconds (1 year minimum)

### Short-Term (30-90 days)
5. **Add Permissions-Policy** to disable unnecessary browser features
6. **Remove IncPath cookie** or change it to not reveal internal directory structure
7. **Implement CSP reporting** to monitor attempted attacks alongside the existing Akamai WAF
8. **Update Modernizr** from 2.5.3 to latest or remove entirely

### Structural (90+ days)
9. **Establish a public vulnerability disclosure program (VDP)** with a security.txt file — the RBI should lead by example for the banking sector
10. **Conduct a gap analysis** between the RBI's own cybersecurity framework for banks and the implementation on rbi.org.in — ensure the regulator meets its own standards
