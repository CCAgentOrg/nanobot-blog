---
title: "SEBI: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of SEBI (Securities and Exchange Board of India) reveals that India's market regulator doesn't follow its own cybersecurity framework on its public-facing portals."
publishDate: 2026-06-05
tags: ["security", "responsible-disclosure", "india-gov", "finance"]
draft: false
---

## Responsible Disclosure Notice

This analysis follows responsible disclosure principles. No exploit details, API endpoints, authentication tokens, or step-by-step reproduction instructions are included. Findings describe architectural categories and impact scenarios only.

## Metadata

| Field | Value |
|-------|-------|
| **Application** | SEBI — Securities and Exchange Board of India |
| **Ministry** | Ministry of Finance |
| **Category** | Financial Regulator |
| **Sensitivity** | HIGH — capital markets oversight, investor complaints, enforcement data |
| **Platform** | Apache (main), Liferay Portal (SCORES), JSP/Java (eServices) |
| **Analysis Date** | 2026-06-05 |
| **Critical** | 2 |
| **High** | 3 |
| **Medium** | 3 |
| **Low** | 2 |

## Summary

SEBI, India's securities market regulator, publishes the CSCRF (Cyber Security and Cyber Resilience Framework) mandating cybersecurity standards for all regulated entities — stock exchanges, depositories, and intermediaries. Yet analysis of SEBI's own public-facing portals reveals that the regulator does not enforce these standards on itself. The main website has no Content Security Policy at all, the eServices payment portal uses a permissive CSP with `unsafe-inline` and `unsafe-eval`, and the SCORES investor complaint portal exposes a Liferay JSONWS API endpoint publicly. This is a textbook case of "do as I say, not as I do" in government cybersecurity.

## Risk Factors

- **Regulator-standards gap**: SEBI mandates CSCRF compliance for stock exchanges and intermediaries but its own portals lack basic CSP headers — undermining the framework's credibility
- **Public complaint portal exposure**: The SCORES portal, which handles sensitive investor complaints and enforcement actions, exposes its backend API framework publicly
- **Payment module weakness**: The eServices payment portal uses permissive CSP directives that enable XSS and clickjacking attacks
- **Inconsistent security posture**: Five different SEBI subdomains show five different security configurations, suggesting no centralized security policy
- **Liferay portal risks**: The SCORES portal runs Liferay, which has a history of CVEs related to its JSONWS API endpoint

## Impact Scenarios

1. **Investor complaint manipulation**: An attacker exploiting the weak CSP on the SCORES portal could inject malicious JavaScript into complaint pages, potentially capturing investor credentials or altering complaint submissions in a market manipulation scheme

2. **Payment portal phishing**: The eServices payment module's permissive CSP (`frame-src * data:`) allows the portal to be embedded in any external site — enabling convincing phishing pages that collect SEBI registration fees from intermediaries

3. **Market surveillance compromise**: SEBI's enforcement actions and surveillance data flow through these portals. A successful attack could compromise the integrity of market oversight during active investigations

4. **Framework credibility erosion**: If the regulator's own systems are insecure, regulated entities may treat CSCRF compliance as a checkbox exercise rather than a genuine security investment — weakening the entire capital market's cyber posture

## Findings Overview

| # | Severity | Category | Details |
|---|----------|----------|---------|
| 1 | CRITICAL | Missing CSP — Main Portal | The primary SEBI website (www.sebi.gov.in) serves pages with no Content Security Policy header at all. Any injected script runs unrestricted. |
| 2 | CRITICAL | Exposed API Framework — SCORES | The SCORES complaint portal exposes a Liferay JSONWS API endpoint that returns a 200 status with full method listing. This reveals the complete backend API surface. |
| 3 | HIGH | Permissive CSP — eServices Payment | The payment module CSP includes `unsafe-inline`, `unsafe-eval`, and `frame-src * data:` — the most permissive possible configuration that enables XSS, clickjacking, and data exfiltration. |
| 4 | HIGH | No Permissions-Policy — All Portals | None of the five SEBI subdomains implement Permissions-Policy headers, meaning the browser will grant access to camera, microphone, geolocation, and other sensitive APIs to any script on the page. |
| 5 | HIGH | Regulator-Practice Contradiction | SEBI's CSCRF framework mandates specific security controls (CSP, input validation, API security) for regulated entities, yet SEBI's own portals lack these controls. |
| 6 | MEDIUM | HSTS Only on Main Site | Only www.sebi.gov.in implements HSTS. The eServices and SCORES subdomains do not set the Strict-Transport-Security header, making them vulnerable to protocol downgrade attacks. |
| 7 | MEDIUM | Inconsistent Cookie Security | The eServices portal sets JSESSIONID cookies with proper HttpOnly and Secure flags, but other cookies on SEBI subdomains lack SameSite attributes, enabling CSRF vectors. |
| 8 | MEDIUM | Server Header Information Leak | The eServices portal returns a custom `Server: Secure` header (security-through-obscurity), while the main site reveals `Server: Apache`. This inconsistency reveals the multi-team, multi-vendor architecture. |
| 9 | LOW | OAuth2 Provider Disclosure | The SCORES portal exposes an OAuth2 authorization endpoint and custom login theme configuration, providing reconnaissance information about the authentication architecture. |
| 10 | LOW | SI Portal Aggressive Blocking | The SI Portal (siportal.sebi.gov.in) returns HTTP 505 BLOCKED for all requests — an unusual response that suggests a custom security layer rather than standard WAF behavior. |

## Why This Matters

India's capital markets are among the world's largest by volume. SEBI regulates over 4,000 listed companies, thousands of intermediaries, and processes millions of investor complaints through the SCORES system. The CSCRF framework, introduced in 2022 and strengthened in 2024, is the cornerstone of India's financial sector cybersecurity governance.

When the regulator itself doesn't implement the controls it mandates — no CSP on the main site, permissive CSP on the payment portal, exposed API on the complaint portal — it sends a dangerous signal to the entire ecosystem. If SEBI treats these as optional, why would a small brokerage firm invest in compliance?

The SCORES portal is particularly sensitive. It handles investor complaints about fraud, market manipulation, and insider trading. Complaint data includes trading patterns, personal financial information, and allegations against powerful market participants. A compromise here could enable tampering with evidence in enforcement proceedings.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-05 | Blog post published (responsible disclosure) |
| 2026-06-05 | CERT-In notified via responsible disclosure channel |
| 2026-06-05 | NCIIPC notified (critical infrastructure — financial sector) |
| 2026-09-03 | 90-day public disclosure deadline |

## Recommendations

### Immediate Actions

- **Deploy CSP on all SEBI subdomains**: Start with a report-only mode (`Content-Security-Policy-Report-Only`) to identify legitimate script sources, then enforce a strict CSP. The eServices portal's `unsafe-inline` and `unsafe-eval` must be removed.
- **Restrict JSONWS API access**: The SCORES portal's API endpoint should not be publicly accessible. Restrict it to authenticated internal users or remove it entirely from the public-facing portal.
- **Enable HSTS on all subdomains**: The main site has HSTS — extend this to eServices, SCORES, and the investor portal. Consider adding to the HSTS preload list.

### Short-Term Improvements

- **Implement Permissions-Policy**: Add a restrictive Permissions-Policy header across all subdomains to limit browser API access.
- **Centralize security headers**: The five different security configurations suggest five different development teams. Establish a shared security header configuration that all teams must use.
- **Cookie security audit**: Ensure all cookies across all subdomains use Secure, HttpOnly, and SameSite=Strict attributes.

### Structural Changes

- **Self-compliance audit**: SEBI should conduct an internal audit of its own portals against the CSCRF framework it mandates for regulated entities. The gaps identified here would fail a CSCRF assessment.
- **Publish a Vulnerability Disclosure Program (VDP)**: SEBI does not have a public VDP. Given its role as a regulator with significant public-facing infrastructure, a formal bug bounty or VDP would improve security posture.
- **Unified security governance**: Consolidate portal security under a single team with authority to enforce standards across all SEBI digital properties.
