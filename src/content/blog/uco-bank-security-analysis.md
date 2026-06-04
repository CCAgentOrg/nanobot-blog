---
title: "UCO Bank: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of UCO Bank (PSU) reveals a dual-stack web infrastructure with stark security disparities, CSP misconfigurations, and the shadow of an ₹820 crore cyber fraud incident."
publishDate: 2026-06-04
tags: ["security", "responsible-disclosure", "india-gov", "finance", "psu-banking"]
draft: false
---

## Responsible Disclosure Notice

This analysis presents security architecture observations from publicly accessible web endpoints. No exploit details, API endpoints, or secrets are disclosed. All findings are derived from HTTP header analysis, Content Security Policy inspection, and publicly reported incidents. The goal is to highlight systemic risks and recommend improvements.

## Metadata

| Field | Value |
|-------|-------|
| **App/Portal** | UCO Bank |
| **Ministry/Org** | UCO Bank (PSU) |
| **Category** | Finance / Banking |
| **Sensitivity** | High (banking transactions, personal financial data) |
| **Platform** | Web (dual-stack: IIS/ASP.NET + Apache/Liferay DXP) |
| **Analysis Date** | 2026-06-04 |
| **Findings** | 0 Critical, 3 High, 5 Medium, 2 Low |

## Summary

UCO Bank operates a dual-stack web infrastructure: the legacy domain (ucobank.com) runs on Microsoft IIS with ASP.NET and **zero security headers**, while the new domain (uco.bank.in) runs Apache with Liferay Digital Experience Platform and implements comprehensive headers. However, even the new domain's Content Security Policy contains critical weaknesses including `unsafe-inline` and `unsafe-eval` directives, exposure of internal Liferay feature flags in client-side JavaScript, and a sprawling trust boundary encompassing multiple chatbot and translation service domains. These findings are contextualized by the **₹820 crore cyber fraud incident** from 2024, where CBI investigated app developers after money was simultaneously reflected in both sender and recipient accounts.

## Risk Factors

- Legacy domain (ucobank.com) is completely unprotected — no HSTS, CSP, X-Frame-Options, or any security headers
- New domain CSP includes `unsafe-inline` and `unsafe-eval`, negating XSS protection
- Internal Liferay DXP feature flags exposed to all visitors in page source
- jQuery 3.5.1 with known CVEs (CVE-2020-11022, CVE-2020-11023) still in use
- Multiple third-party chatbot domains whitelisted in CSP expand the attack surface
- CSP `frame-ancestors` includes legacy domains vulnerable to clickjacking
- Historical ₹820 crore fraud indicates systemic architecture weaknesses in transaction processing

## Impact Scenarios

### Scenario 1: Clickjacking via Legacy Domain

A customer receives a link to the old ucobank.com domain. Because this domain has **no X-Frame-Options or frame-ancestors CSP directive**, an attacker could embed the old domain in an invisible iframe. A crafted phishing page could overlay fake UI elements on top of the real UCO Bank page. Since the new domain's CSP allows framing from the old domain (`frame-ancestors` includes ucobank.com), the attack surface extends to the banking portal itself. A customer might believe they are clicking a legitimate button while actually interacting with the embedded banking page.

### Scenario 2: XSS via Third-Party Chatbot Domain

The CSP trusts multiple chatbot service domains (at least four distinct hostnames across `.in` and `.bank.in` TLDs). If any one of these services is compromised — say through a supply chain attack on the chatbot vendor — the attacker gains the ability to execute arbitrary JavaScript on uco.bank.in. The `unsafe-eval` directive in script-src means that even content loaded from these trusted origins can use `eval()` and similar dynamic code execution, making malicious payload delivery trivial. An attacker could capture login credentials, session tokens, or manipulate displayed content.

### Scenario 3: Repeat of ₹820 Crore Architecture Exploit

The 2024 fraud involved money simultaneously appearing in both the origin and beneficiary accounts, suggesting a race condition or insufficient transaction idempotency in the core banking integration layer. While this is a backend architecture issue rather than a web-facing vulnerability, the exposed Liferay feature flags and server version information give potential attackers a detailed map of the bank's technology stack (Liferay DXP version, enabled modules, React frontend), enabling targeted research into known vulnerabilities of those specific components.

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| **HIGH** | Missing Security Headers | Legacy domain (ucobank.com) has zero security headers: no HSTS, CSP, X-Frame-Options, X-Content-Type-Options, or X-XSS-Protection |
| **HIGH** | CSP Misconfiguration | `unsafe-inline` and `unsafe-eval` in script-src negates XSS protection on new domain |
| **HIGH** | Historical Incident | ₹820 crore cyber fraud (2024) — CBI investigated app developers; money reflected in both accounts simultaneously, indicating fundamental transaction processing architecture flaw |
| **MEDIUM** | Information Disclosure | Liferay DXP feature flags (60+ entries) exposed in client-side JavaScript, revealing CMS version, enabled features, and internal configuration |
| **MEDIUM** | Outdated Dependencies | jQuery 3.5.1 in use — vulnerable to CVE-2020-11022 and CVE-2020-11023 (XSS via HTML manipulation) |
| **MEDIUM** | CSP Frame-Ancestors Risk | frame-ancestors includes legacy domains (ucobank.com, ucoebanking.com) that themselves lack clickjacking protection |
| **MEDIUM** | Expanded Trust Boundary | CSP trusts 4+ chatbot domains across multiple TLDs (.in, .bank.in) plus Bhashini translation plugin — each is a potential compromise vector |
| **MEDIUM** | Server Version Disclosure | IIS/10.0 and Apache server headers exposed; Liferay DXP platform identifier in HTTP response |
| **LOW** | Outdated Dependencies | Bootstrap 5.2.3 (current is 5.3.x) |
| **LOW** | Minor Information Leak | Google Analytics tracking ID (G-*) exposed in page source |

## Architecture Observations

### Dual-Stack Infrastructure

UCO Bank appears to be in the middle of a platform migration:

- **Legacy**: `ucobank.com` → Microsoft IIS/10.0, ASP.NET — serves only a redirect page to the new domain
- **Current**: `uco.bank.in` → Apache, Liferay Digital Experience Platform — full banking website with React SPA modules, chatbot integration, Bhashini translation

The legacy domain is a single HTML page with Bootstrap 5.3.3 that auto-redirects to uco.bank.in after 9 seconds. Despite being just a redirect, it still exposes server version information and lacks all security headers.

### Content Security Policy Analysis

The CSP on uco.bank.in is one of the most complex seen in this audit series (~1800 characters). Key concerns:

1. **`unsafe-inline` + `unsafe-eval`** in script-src: These effectively disable the CSP's ability to prevent XSS. Any inline script injection will execute freely.
2. **WebSocket trust**: `wss://` connections to multiple chatbot domains are whitelisted — a compromised chatbot service could establish persistent WebSocket connections for data exfiltration.
3. **Bhashini integration**: The government's translation service plugin is trusted across multiple CSP directives. While government-hosted, this adds another dependency.
4. **`media-src 'self' data: blob: *'**: The wildcard allows media from any source via blob URLs.

### The ₹820 Crore Incident

In November 2024, UCO Bank reported a "technical glitch" where ₹820 crore was erroneously credited across accounts. CBI investigations later revealed that app developers were allegedly involved in the fraud. The mechanism — money appearing in both the sender's and receiver's accounts simultaneously — suggests either:
- A race condition in the IMPS/NEFT transaction processing pipeline
- Insufficient idempotency controls allowing duplicate transaction processing
- Deliberate exploitation of a window between debit and credit reconciliation

The government convened meetings with RBI, NPCI, and TRAI following this incident. CBI raided 65 locations and seized 43 digital devices.

## Why This Matters

UCO Bank is a public sector bank with over 3,000 branches serving millions of Indians. The dual-stack infrastructure pattern — where a legacy domain is maintained alongside a new platform — is common across Indian PSU banks. The security gap between the two stacks creates a persistent attack surface.

The ₹820 crore fraud, combined with the web security findings, paints a picture of a bank that has invested in modern infrastructure (Liferay DXP, HSTS, CSP) but has significant gaps in implementation quality (unsafe-inline/eval, exposed feature flags) and legacy hygiene (unprotected old domain).

See also: [SBI PensionSeva Security Analysis](/blog/sbi-pensionseva-security-analysis/) and [NSDL e-Services Security Analysis](/blog/nsdl-eservices-security-analysis/) for similar findings at other Indian financial institutions.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-04 | Blog post published with responsible disclosure |
| Pending | CERT-In notification |
| Pending | UCO Bank CISO contact |
| 2026-09-02 | 90-day public disclosure deadline |

## Recommendations

### Immediate (0-30 days)
1. **Add security headers to ucobank.com**: At minimum, HSTS, X-Frame-Options: DENY, and a restrictive CSP that only allows redirection
2. **Remove `unsafe-eval`** from CSP script-src on uco.bank.in — this is rarely needed by modern frameworks
3. **Remove Liferay feature flags** from client-side JavaScript — serve only the flags needed by the frontend

### Short-Term (30-90 days)
4. **Upgrade jQuery** from 3.5.1 to latest (3.7.1+) to address known CVEs
5. **Reduce CSP trust boundary**: Audit chatbot domains; remove any that are not actively used; consider using nonce-based CSP instead of domain allowlisting
6. **Remove `unsafe-inline`** from CSP by migrating to nonce-based script loading (Liferay DXP supports this natively)
7. **Remove legacy domains from `frame-ancestors`**: Only `frame-ancestors 'self'` should be needed

### Structural (90+ days)
8. **Decommission ucobank.com**: Serve a 301 redirect at the DNS/CDN level rather than maintaining a separate IIS server
9. **Implement Content Security Policy reporting** to detect attempted XSS attacks in real-time
10. **Conduct a full CSP audit** considering the lessons from the ₹820 crore fraud — ensure the banking transaction layer has the same rigor applied to its API security as the marketing website should have for its web security
