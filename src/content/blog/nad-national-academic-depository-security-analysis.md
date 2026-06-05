---
title: "NAD (National Academic Depository): Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of India's National Academic Depository reveals publicly accessible development/testing infrastructure, wildcard CORS on the academic records API, and vendor domain exposure affecting millions of student records."
publishDate: 2026-06-05
tags: ["security", "responsible-disclosure", "india-gov", "identity", "education", "digilocker"]
draft: false
---

## Responsible Disclosure Notice

This analysis describes architectural weaknesses and their potential impact. No exploit details, API endpoints, secret values, or reproduction instructions are included. Findings are classified by severity with hypothetical impact scenarios.

## Metadata

| Field | Value |
|-------|-------|
| **Target** | National Academic Depository (NAD) |
| **Ministry** | Ministry of Education (MoE) |
| **Components** | NAD Portal (nad.gov.in), NAD DigiLocker (nad.digilocker.gov.in), NAD API |
| **Category** | Identity — Academic Records |
| **Sensitivity** | HIGH (degrees, diplomas, mark sheets, student PII) |
| **Platform** | Web (Apache + custom NAD server + DigiLocker infrastructure) |
| **Analysis Date** | 2026-06-05 |
| **Critical** | 3 |
| **High** | 3 |
| **Medium** | 3 |
| **Low** | 2 |

## Summary

The National Academic Depository (NAD) is India's centralized digital repository for academic awards — degrees, diplomas, certificates, and mark sheets from universities, boards, and institutions across India. Analysis reveals that the production CORS headers expose the URLs of development, beta, and testing environments (all publicly accessible), the academic records API has wildcard CORS (`access-control-allow-origin: *`), and the vendor's admin dashboard rotates through multiple government analytics portals including UMANG, API Setu, and DigiLocker.

## Risk Factors

- **Scale**: Millions of academic records from Indian universities and boards
- **Data sensitivity**: Student names, dates of birth, degree details, university enrollment data
- **Vendor infrastructure**: Core systems hosted on a non-government domain (dl6.in)
- **DigiLocker integration**: Linked to India's digital identity infrastructure
- **API Setu exposure**: Connected to the government's API gateway
- **No public VDP**: No vulnerability disclosure program found

## Impact Scenarios

### Scenario 1: Dev Environment Data Access

The development environment for NAD is publicly accessible on the internet at a vendor domain. A dev/testing API instance returns "NAD API TESTING V7" as its banner. Development environments typically have weaker authentication, verbose error messages, debug logging, and may contain test data that mirrors production records (or even real data used during testing). An attacker could probe the dev API to discover undocumented endpoints, extract error messages revealing database schemas, or find hardcoded credentials in debug endpoints.

### Scenario 2: Cross-Origin Academic Record Queries

The production NAD API returns `access-control-allow-origin: *` — meaning any website on the internet can make JavaScript requests to the NAD API from a victim's browser. Combined with the `encryptkey` header explicitly listed in allowed CORS headers, a malicious website could attempt to query academic records if a student is already authenticated with NAD in their browser session. The wildcard CORS effectively neutralizes the same-origin policy for the API.

### Scenario 3: Admin Dashboard Access

The vendor's common dashboard is publicly accessible and cycles through analytics dashboards for DigiLocker, API Setu, UMANG, MyScheme, and UX4G. While these appear to be "public" or "shared" dashboard views, the central orchestration dashboard itself being accessible reveals the vendor's infrastructure topology. An attacker could monitor these dashboards to understand traffic patterns, usage statistics, and operational data about India's digital public infrastructure.

### Scenario 4: Vendor Domain Dependency

All NAD development, beta, API, and CDN infrastructure runs on a single vendor domain (dl6.in) rather than government infrastructure. If this domain's registration lapses, is compromised, or the vendor relationship changes, the entire NAD development and testing pipeline could be hijacked. Academic records data flowing through vendor infrastructure raises governance questions about data custody.

## Findings Overview

| Severity | Category | Description | Component |
|----------|----------|-------------|-----------|
| CRITICAL | Exposed Dev Infrastructure | Development NAD app publicly accessible on vendor domain | dev-nad-app.dl6.in |
| CRITICAL | Exposed Test API | Beta and dev APIs publicly accessible, banner reads "NAD API TESTING V7" | betanadapi.dl6.in, nd-devapi.dl6.in |
| CRITICAL | Wildcard CORS on API | `access-control-allow-origin: *` on production academic records API | nadapi.digilocker.gov.in |
| HIGH | Admin Dashboard Exposed | Common dashboard cycles through government analytics portals | dashboard.dl6.in |
| HIGH | Vendor Domain Dependency | All dev/beta/API/CDN on non-government dl6.in domain | Infrastructure |
| HIGH | CORS Reveals `encryptkey` | Client-side encryption key header name exposed in CORS allow-headers | nadapi.digilocker.gov.in |
| MEDIUM | CSP Has unsafe-inline/eval | `unsafe-inline` and `unsafe-eval` in script-src weaken XSS protection | nad.digilocker.gov.in |
| MEDIUM | CSP Has img-src Wildcard | `img-src *` allows loading images from any domain (data exfiltration risk) | nad.digilocker.gov.in |
| MEDIUM | Stale Rate Limit | Rate limit reset timestamp is from November 2023 — rate limiting may be broken | nad.digilocker.gov.in |
| LOW | Outdated Facebook SDK | nad.gov.in includes Facebook SDK v2.9 (2017) — known security issues | nad.gov.in |
| LOW | Partial CSP on Info Site | nad.gov.in has only `img-src` in CSP, no script-src or default-src | nad.gov.in |

## Why This Matters

NAD sits at the intersection of two critical India DPI systems: DigiLocker (digital document storage) and API Setu (government API gateway). A vulnerability in NAD doesn't just risk academic records — it could serve as a pivot point into the broader digital infrastructure ecosystem. The [U-WIN audit](/blog/u-win-vaccinator-security-analysis/) showed how government apps sharing infrastructure creates cascading vulnerabilities. NAD's integration with DigiLocker, API Setu, and UMANG amplifies this risk.

The publicly accessible development and testing environments are particularly concerning. As seen in the [NSDL e-Services analysis](/blog/nsdl-eservices-security-analysis/), development environments often contain hardcoded credentials, verbose error messages, and debug endpoints that provide attackers with a roadmap for attacking production systems. The "NAD API TESTING V7" banner confirms these are active testing environments, not abandoned infrastructure.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-05 | Blog post published (responsible disclosure) |
| 2026-06-05 | Report to be filed with CERT-In |
| 2026-06-05 | Report to be filed with NCIIPC (education infrastructure) |
| 2026-06-05 | Report to be filed with MeitY (DigiLocker operator) |
| 2026-09-03 | 90-day public disclosure deadline |

## Recommendations

### Immediate (0-7 days)

1. **Block public access to dev/beta environments**: Restrict dev-nad-app.dl6.in, betanad.dl6.in, nd-devapi.dl6.in, betanadapi.dl6.in, and dashboard.dl6.in to authorized IPs only
2. **Remove wildcard CORS**: Change `access-control-allow-origin: *` to specific allowed origins on nadapi.digilocker.gov.in
3. **Remove dev domain URLs from production CORS**: Strip dl6.in domains from production access-control-allow-origin headers

### Short-term (7-30 days)

4. **Migrate to government domains**: Move dev/beta/API infrastructure from dl6.in to .gov.in/.nic.in domains
5. **Fix CSP**: Remove `unsafe-inline` and `unsafe-eval` from script-src; change `img-src *` to specific domains
6. **Fix rate limiting**: Update the stale rate limit reset timestamp; verify rate limiting is actually enforced
7. **Update Facebook SDK**: Remove or update the Facebook SDK v2.9 on nad.gov.in

### Structural (30+ days)

8. **Establish a VDP**: Create a public vulnerability disclosure program for NAD and DigiLocker
9. **Separate development from production infrastructure**: Ensure dev/beta/test environments cannot access production data
10. **Audit vendor access**: Review what data dl6.in vendor infrastructure can access and ensure contractual data protection obligations
11. **API security review**: Full audit of the NAD API authentication, authorization, and encryption mechanisms

---

*Part of the [Indian Government Digital Services Security Audit](/blog/) series. See also: [DigiLocker-related: DFPD TPDS](/blog/dfpd-tpds-security-analysis/), [CBSE OASIS](/blog/cbse-oasis-security-analysis/), [ECI Voter Services](/blog/eci-voter-services-security-analysis/).*
