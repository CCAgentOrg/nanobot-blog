---
title: "SBI CMS: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of SBI's Complaint Management System and web infrastructure reveals internal infrastructure details exposed in public documents and a CSP with unsafe-inline/unsafe-eval across SBI's domains."
publishDate: 2026-06-04
tags: ["security", "responsible-disclosure", "india-gov", "finance", "sbi"]
draft: false
---

## Responsible Disclosure Notice

This analysis presents security architecture observations from publicly accessible web endpoints and documents. No exploit details, API endpoints, or secrets are disclosed. All findings are derived from HTTP header analysis, publicly accessible PDF documents, and reported incidents.

## Metadata

| Field | Value |
|-------|-------|
| **App/Portal** | SBI CMS (Complaint Management System) |
| **Ministry/Org** | State Bank of India (PSU) |
| **Category** | Finance / Banking |
| **Sensitivity** | High (customer complaints, account data) |
| **Platform** | Web (unreachable; analyzed sbi.co.in and sbi.bank.in) |
| **Analysis Date** | 2026-06-04 |
| **Findings** | 0 Critical, 2 High, 3 Medium, 1 Low |

## Summary

SBI's Complaint Management System (cms.onlinesbi.com) — the portal where customers lodge banking complaints — was unreachable from external networks during analysis. However, analysis of SBI's publicly accessible web properties (sbi.co.in and sbi.bank.in) and public documents reveals that SBI's own "Handbook on Customer Grievance Redressal Mechanism" exposes an internal IP address for the UPI Admin Dashboard. Additionally, the CSP on both sbi.co.in and sbi.bank.in contains `unsafe-inline` and `unsafe-eval` directives, and a 2023 data breach exposed 12,000 SBI employees' confidential records via Telegram.

## Risk Factors

- Public PDF exposes internal IP address (10.189.38.59) for UPI Admin Dashboard
- 12,000 employee records leaked via Telegram in 2023
- CSP allows `unsafe-inline` and `unsafe-eval` on both main SBI domains
- CMS portal unreachable from external networks — availability concern for customer complaint filing
- 15+ internal department email addresses exposed in public handbook

## Impact Scenarios

### Scenario 1: Internal Infrastructure Targeting via Exposed IP

SBI's public grievance handbook contains a reference to an internal IP address for the "UPIAdminDashboard." While this IP is internal (10.x.x.x range) and not directly accessible from the internet, its exposure in a public document gives attackers valuable reconnaissance information. A sophisticated attacker could use this information to:
- Target SBI employees with phishing emails referencing the specific dashboard URL
- Use social engineering to convince employees to expose the internal network
- Combine with VPN vulnerabilities (as seen in the C-Edge/NPCI incident) to reach the internal dashboard

### Scenario 2: Employee Data for Targeted Attacks

The 2023 breach of 12,000 SBI employee records — leaked through Telegram channels — provides attackers with employee names, PF numbers, branch assignments, and contact details. This data enables highly targeted spear-phishing attacks against SBI staff who have access to internal systems including the CMS portal, UPI infrastructure, and customer complaint databases.

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| **HIGH** | Information Disclosure | Public grievance handbook exposes internal IP address for UPI Admin Dashboard |
| **HIGH** | Data Breach | 12,000 SBI employee confidential records leaked via Telegram channels (2023) |
| **MEDIUM** | CSP Misconfiguration | unsafe-inline and unsafe-eval in script-src on both sbi.co.in and sbi.bank.in |
| **MEDIUM** | Availability | CMS portal (cms.onlinesbi.com) unreachable from external networks — customer complaint filing may be impacted |
| **MEDIUM** | Information Disclosure | 15+ internal department email addresses exposed in public PDF with naming conventions revealing organizational structure |
| **LOW** | Information Disclosure | Akamai WAF session cookies on both domains |

## Architecture Observations

### Dual-Domain Infrastructure

SBI operates two main web domains:
- **sbi.co.in** — Legacy domain, redirects to sbi.co.in/redirect/ (likely being phased out)
- **sbi.bank.in** — New RBI-mandated domain, serves the main SBI website (Liferay-based, Java/WebSphere)

Both domains share identical CSP and security header configurations, suggesting centralized CDN/Akamai policy management.

### Security Headers (sbi.bank.in)

The security posture is generally good:
- HSTS with 1-year max-age and includeSubDomains
- CSP present (but with unsafe-inline/unsafe-eval)
- Permissions-Policy (camera, microphone, autoplay disabled)
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Referrer-Policy: no-referrer-when-downgrade
- Cookies properly secured (Secure, HttpOnly, SameSite=Strict)

The main gap is `unsafe-inline` and `unsafe-eval` in the CSP script-src — these negate much of the XSS protection that CSP provides.

### The Public Handbook Problem

SBI's "Handbook on Customer Grievance Redressal Mechanism" is hosted publicly and contains:
- Internal IP addresses (UPI Admin Dashboard)
- 15+ department-specific email addresses (epg.cms@sbi.co.in, rupaypos.cms@sbi.co.in, etc.)
- Internal escalation hierarchies with phone numbers
- References to internal systems (CRM, SB Collect, SBI e-Pay)

This information, while intended for employees, is publicly accessible and provides a detailed map of SBI's internal organizational structure and technology stack.

## Why This Matters

SBI is India's largest bank with over 500 million customers. The CMS portal is the primary channel for customer complaint resolution — if it's unavailable, customers cannot track or escalate grievances. The exposure of internal infrastructure details in public documents, combined with the 2023 employee data breach, creates a recon-rich environment for targeted attacks.

See also: [UCO Bank Security Analysis](/blog/uco-bank-security-analysis/) and [NPCI Security Analysis](/blog/npci-security-analysis/).

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-04 | Blog post published |
| Pending | CERT-In notification |
| Pending | SBI CISO contact |
| 2026-09-02 | 90-day public disclosure deadline |

## Recommendations

### Immediate (0-30 days)
1. **Remove internal IP addresses** from public-facing PDF documents
2. **Audit all public PDFs** for internal infrastructure references (email addresses, IPs, system names)
3. **Verify CMS portal availability** from external networks — if intentionally internal-only, document this and provide alternative access methods for customers

### Short-Term (30-90 days)
4. **Remove `unsafe-eval`** from CSP script-src on sbi.co.in and sbi.bank.in
5. **Migrate to nonce-based CSP** to eliminate `unsafe-inline` dependency
6. **Use generic email addresses** (complaints@sbi.co.in) instead of department-specific addresses in public documents

### Structural (90+ days)
7. **Establish document classification** — internal system references should never appear in publicly distributed PDFs
8. **Implement automated document scanning** for sensitive information before publication
