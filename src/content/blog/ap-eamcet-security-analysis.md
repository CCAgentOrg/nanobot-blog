---
title: "AP EAMCET/APSCHE CETs: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of AP EAMCET and the APSCHE Common Entrance Tests portal reveals missing security headers on the JSP-based exam platform and a weak CSP on the main portal."
publishDate: 2026-06-06
tags: ["security", "responsible-disclosure", "india-gov", "education", "jsp", "apsche"]
draft: false
---

## Responsible Disclosure Notice

This analysis describes architectural weaknesses discovered through passive inspection of publicly accessible endpoints. No exploit steps or reproduction instructions are included.

---

## Metadata

| Field | Value |
|-------|-------|
| **Target** | AP EAMCET / APSCHE CETs Portal |
| **Ministry** | MoE (Andhra Pradesh State) |
| **Category** | Education (Entrance Exams) |
| **Sensitivity** | Medium (exam registration, candidate data) |
| **Platform** | Web (ASP.NET main + JSP exam portals on aptonline.in) |
| **Analysis Date** | 2026-06-06 |
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 3 |
| **Low** | 3 |

---

## Summary

The APSCHE Common Entrance Tests portal (cets.apsche.ap.gov.in) is a hub that redirects candidates to individual exam portals hosted by AP Online (aptonline.in). The main hub portal has reasonable security headers but a weak CSP. The actual exam portals (JSP-based on aptonline.in) have no security headers at all, and session cookies lack Secure and SameSite attributes. No critical vulnerabilities were found — the platform's architecture of separating the public hub from authenticated exam portals provides a reasonable security baseline.

---

## Impact Scenarios

### Scenario 1: Session Hijacking on Exam Portal

A student logs into the EAPCET portal at a public WiFi hotspot. The JSESSIONID cookie is set without the Secure flag, meaning it's transmitted over plaintext if any HTTP request occurs. An attacker on the same network could capture the session cookie and access the student's exam registration, potentially modifying college preferences or personal details before the deadline.

*Impact*: Modification of college choices, personal data exposure, or registration disruption for individual candidates.

### Scenario 2: Clickjacking on Exam Portal

The JSP exam portals lack X-Frame-Options and CSP frame-ancestors directives. An attacker could embed the exam portal login page in a hidden iframe on a fraudulent "AP EAMCET Help" page. Candidates entering credentials would be unknowingly authenticating into the real portal while the attacker's page captures or modifies their actions.

*Impact*: Credential theft or unauthorized modifications to exam registrations via clickjacking.

---

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| **MEDIUM** | Missing Headers (JSP) | No CSP, X-Frame-Options, HSTS, or X-Content-Type-Options on aptonline.in exam portals |
| **MEDIUM** | Cookie Security | JSESSIONID lacks Secure and SameSite flags on exam portals |
| **MEDIUM** | Weak CSP (Hub) | Main portal CSP only has `font-src *;img-src * data:;` — missing script-src, style-src, frame-ancestors |
| **LOW** | Info Disclosure | `X-Powered-By: JSP/2.3` header reveals server technology |
| **LOW** | Commented Code | Old login URLs and internal links visible in HTML comments |
| **LOW** | Explicit Port | JS sources include explicit `:443` port in URLs |

---

## Architecture Observed

- **Main Hub** (cets.apsche.ap.gov.in): ASP.NET on IIS, redirects to individual exam portals
- **Exam Portals** (*.aptonline.in): Java/JSP on Apache, handles registration and admissions
- **Vendor**: AP Online (aptonline.in) — Andhra Pradesh's e-governance services provider
- **Individual portals**: EAPCET, PGECET, LAWCET, ICET, ECET, EDCET, PECET, PGCET, OAMDC, APRCET

---

## Recommendations

### Immediate

1. Add `Secure` and `SameSite=Lax` attributes to JSESSIONID cookies on all aptonline.in exam portals
2. Add security headers (CSP, X-Frame-Options, HSTS) to all JSP exam portals

### Short-term

3. Strengthen CSP on main hub portal — add `script-src`, `style-src`, `frame-ancestors 'self'` directives
4. Remove `X-Powered-By` header
5. Clean up HTML comments containing internal URLs

### Structural

6. Standardize security headers across all CET portals (currently inconsistent between hub and exam portals)
7. Consider centralizing exam portals on a single secure domain with consistent security policy
