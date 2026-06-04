---
title: "NPCI: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of NPCI (National Payments Corporation of India) reveals missing CSP and security headers on the main portal, exposed Akamai bot management keys, and the shadow of a ransomware attack that disrupted UPI for 300 banks."
publishDate: 2026-06-04
tags: ["security", "responsible-disclosure", "india-gov", "finance", "npci", "upi"]
draft: false
---

## Responsible Disclosure Notice

This analysis presents security architecture observations from publicly accessible web endpoints. No exploit details, internal API endpoints, or authentication bypass methods are disclosed. All findings are derived from HTTP header analysis, JavaScript bundle inspection, and publicly reported incidents. The goal is to highlight systemic risks and recommend improvements for India's most critical payments infrastructure.

## Metadata

| Field | Value |
|-------|-------|
| **App/Portal** | NPCI (National Payments Corporation of India) |
| **Ministry/Org** | NPCI (RBI-regulated) |
| **Category** | Finance / Payment Systems |
| **Sensitivity** | Critical (UPI, RuPay, IMPS, FASTag, NACH, BBPS) |
| **Platform** | Web (React SPA + Akamai CDN/WAF) |
| **Analysis Date** | 2026-06-04 |
| **Findings** | 0 Critical, 3 High, 4 Medium, 2 Low |

## Summary

NPCI, the organization that operates UPI, RuPay, IMPS, FASTag, and Bharat BillPay — the backbone of India's digital payments infrastructure — runs its main website (npci.org.in) as a React single-page application behind Akamai's CDN and Web Application Firewall. While the UPI subdomain (upi.npci.org.in) has comprehensive security headers, the **main NPCI website is missing a Content Security Policy, X-Frame-Options, X-Content-Type-Options, and Permissions-Policy** — only HSTS is configured. Additionally, Akamai Bot Manager configuration data including RUM API keys, customer portal codes, and sensor data tokens are exposed in the page source. These findings are contextualized by the **July 2024 ransomware attack on C-Edge Technologies**, a NPCI technology provider, which disrupted UPI and IMPS services for approximately 300 regional rural and cooperative banks.

## Risk Factors

- Main NPCI website missing CSP, X-Frame-Options, X-Content-Type-Options, and Permissions-Policy
- Akamai Bot Manager API key and configuration exposed in client-side JavaScript
- Inconsistent security posture across subdomains (upi.npci.org.in is well-secured, www.npci.org.in is not)
- Facebook Pixel and Google Ads conversion tracking on critical financial infrastructure site
- React SPA with user authentication endpoints (OTP, registration) visible in JS bundle
- Historical supply chain attack (C-Edge ransomware) disrupted payments for 300 banks

## Impact Scenarios

### Scenario 1: Supply Chain Attack via Third-Party Tracking Scripts

The NPCI website loads Facebook Pixel and Google Ads conversion scripts. These are marketing tools that track user behavior — they have no business being on the website of the organization that operates UPI. If either Facebook's or Google's script infrastructure were compromised (as has happened multiple times in the past), the attacker could execute arbitrary JavaScript on npci.org.in. Without a Content Security Policy, the browser has no mechanism to reject malicious script injections from these trusted third-party origins. An attacker could steal session cookies, capture form inputs, or redirect users to phishing pages — all appearing to come from the legitimate NPCI domain.

### Scenario 2: Repeat of C-Edge Supply Chain Compromise

The July 2024 C-Edge Technologies ransomware attack demonstrated that NPCI's ecosystem includes technology providers with significant access to the payment network. The attackers exploited CVE-2024-23897, a vulnerability in Jenkins CLI (an open-source automation tool), to gain initial access to C-Edge's infrastructure. From there, they could potentially have moved laterally into NPCI's payment systems. While NPCI responded by isolating C-Edge, the incident reveals a fundamental supply chain risk: the security of India's entire digital payment system depends on the security posture of every technology provider in the chain. The exposed Akamai configuration data on the main website provides attackers with a detailed map of NPCI's CDN infrastructure, edge server hostnames, and monitoring setup.

### Scenario 3: Phishing via NPCI Domain Trust

Because npci.org.in lacks X-Frame-Options and CSP frame-ancestors, the website can be embedded in iframes on any domain. An attacker could create a phishing page that embeds the real NPCI website in an invisible frame, overlays fake login forms, and captures credentials. Citizens trust the NPCI domain implicitly — UPI apps display "Verified by NPCI" badges. A convincing phishing attack leveraging the real NPCI domain in an iframe could be devastating for consumer trust in digital payments.

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| **HIGH** | Missing Security Headers | Main website (www.npci.org.in) missing CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy — only HSTS is configured |
| **HIGH** | Supply Chain Incident | C-Edge Technologies ransomware (July 2024) — Jenkins CVE-2024-23897 exploited, disrupting UPI/IMPS for ~300 banks; NPCI had to isolate the provider |
| **HIGH** | Configuration Exposure | Akamai Bot Manager RUM API key, CP code, edge hostname, and sensor data token exposed in client-side `<APM_DO_NOT_TOUCH>` block |
| **MEDIUM** | Third-Party Tracking | Facebook Pixel (ID: 1.26B+) and Google Ads conversion tracking loaded on critical financial infrastructure site |
| **MEDIUM** | Auth Surface Exposure | React JS bundle (2.5MB) contains auth endpoints: register-verify-otp, request-otp, signup, verify-otp — reveals NPCI website has user registration/login functionality |
| **MEDIUM** | Large Attack Surface | 2.5MB minified React bundle contains full application logic, third-party library code (jszip, date-fns, popper), and PKI/authentication code |
| **MEDIUM** | Inconsistent Security Posture | upi.npci.org.in has X-Frame-Options: DENY, X-XSS-Protection, X-Content-Type-Options — while www.npci.org.in has none of these |
| **LOW** | Information Disclosure | Google Analytics (G-*) and Facebook Pixel IDs exposed in page source |
| **LOW** | Information Disclosure | Akamai server-timing header leaks CDN request metadata |

## Architecture Observations

### Dual Security Posture

NPCI's infrastructure shows a stark contrast between subdomains:

- **www.npci.org.in** (marketing/info site): React SPA, Akamai CDN, HSTS only — no CSP, no frame protection, no content type protection
- **upi.npci.org.in** (UPI services): Comprehensive headers (HSTS, X-Frame-Options: DENY, X-XSS-Protection, X-Content-Type-Options: nosniff)

This suggests the UPI-facing infrastructure was built with security in mind, while the main website — which citizens visit for information about UPI, RuPay, and other payment systems — received less security attention.

### Akamai Bot Management

The NPCI website uses Akamai's Bot Manager (APM) for anti-automation protection. The `<APM_DO_NOT_TOUCH>` script block in the page source contains:

- Boomerang Real User Monitoring (RUM) API key
- Akamai CP (Customer Portal) code
- Akamai edge server hostname (Akamaihd.net)
- Encrypted sensor data tokens (long hex strings)
- Browser fingerprinting configuration

While this data is designed to be client-side, the exposure of the RUM API key and CP code gives attackers specific identifiers for NPCI's Akamai account, useful for targeted attacks.

### The C-Edge Ransomware Attack (July 2024)

On July 31, 2024, NPCI disclosed that C-Edge Technologies — a technology service provider catering to regional rural banks — had been hit by ransomware. The attack was later traced to CVE-2024-23897, a critical vulnerability in Jenkins Command Line Interface that allows arbitrary file reading and potential remote code execution.

NPCI isolated C-Edge from its retail payment systems, but not before UPI and IMPS services were disrupted for approximately 300 small and cooperative banks. Services were restored after several hours, but the incident highlighted the fragility of India's payment infrastructure when dependent on third-party technology providers.

Juniper Networks later published a detailed analysis of how the attackers weaponized the Jenkins vulnerability, noting that this was a supply chain attack where the initial compromise of C-Edge's infrastructure cascaded into disruption of the national payment system.

## Why This Matters

NPCI processes billions of transactions monthly through UPI alone. The organization is the nerve center of India's digital payments ecosystem. When NPCI's website has weaker security headers than a typical blog, and when third-party marketing tracking scripts are loaded alongside critical payment system information, it reflects a security posture gap between the core payment infrastructure and the supporting web presence.

The C-Edge incident demonstrated that the supply chain is the weakest link. The exposed Akamai configuration and missing CSP on the main website suggest that the "crown jewels" (UPI core) are well-protected, but the supporting infrastructure around them has gaps that could be exploited for reconnaissance and phishing.

See also: [UCO Bank Security Analysis](/blog/uco-bank-security-analysis/) and [SBI PensionSeva Security Analysis](/blog/sbi-pensionseva-security-analysis/) for other Indian financial institution findings.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-04 | Blog post published with responsible disclosure |
| Pending | CERT-In notification |
| Pending | NPCI CISO contact |
| 2026-09-02 | 90-day public disclosure deadline |

## Recommendations

### Immediate (0-30 days)
1. **Deploy CSP on www.npci.org.in**: Start with a restrictive policy; at minimum, set `default-src 'self'` and `frame-ancestors 'none'`
2. **Add X-Frame-Options: DENY** and X-Content-Type-Options: nosniff to all NPCI web properties
3. **Remove Facebook Pixel and Google Ads conversion tracking** from npci.org.in — marketing tracking scripts have no place on critical financial infrastructure

### Short-Term (30-90 days)
4. **Minimize Akamai Bot Manager exposure**: Consider moving the `<APM_DO_NOT_TOUCH>` script to a separate, non-cacheable endpoint to reduce reconnaissance value
5. **Implement nonce-based CSP** for the React SPA to eliminate reliance on domain allowlisting
6. **Conduct a supply chain security audit** of all NPCI technology providers — the C-Edge incident showed that one vulnerable Jenkins server can disrupt 300 banks
7. **Add Permissions-Policy** to disable unnecessary browser features (camera, microphone, geolocation) on payment-related pages

### Structural (90+ days)
8. **Standardize security headers across all NPCI subdomains**: Create a baseline header policy and enforce it at the CDN/Akamai configuration level, not per-application
9. **Implement CSP reporting** to detect attempted script injection attacks in real-time
10. **Establish a public vulnerability disclosure program (VDP)**: NPCI currently has no public security.txt or responsible disclosure portal — for an organization operating India's payment backbone, this is a critical gap
