---
title: "CUET NTA Portal: Security Architecture Analysis & Responsible Disclosure"
description: "Analysis of NTA's CUET portal (cuet.nta.nic.in) reveals a critical CSP gap — no script-src directive — combined with NTA's documented history of exam paper leaks and a 2025 candidate data breach affecting 130,000+ medical aspirants."
publishDate: 2026-06-02
draft: false
---

The National Testing Agency (NTA) conducts India's highest-stakes entrance examinations — NEET, JEE, CUET, and others — affecting millions of students annually. The CUET (Common University Entrance Test) portal at cuet.nta.nic.in is the gateway for undergraduate admissions to central universities. This analysis examines the portal's security architecture in the context of NTA's troubled history with data leaks and exam integrity.

---

## Responsible Disclosure Notice

This analysis is based on publicly observable HTTP headers, published news reports, and official statements. No exploitation was performed. No authentication was bypassed. No private data was accessed.

---

## Metadata

| Field | Value |
|-------|-------|
| **Portal** | CUET NTA |
| **Domain** | cuet.nta.nic.in |
| **Ministry** | Ministry of Education (MoE) |
| **Category** | Education / Examination |
| **Platform** | Web (S3Waas — government WordPress hosting by NIC) |
| **Data Sensitivity** | **Very High** — Student PII, exam scores, admission data |
| **Analysis Date** | 2026-06-02 |
| **Critical Findings** | 1 |
| **High Findings** | 2 |
| **Medium Findings** | 2 |
| **Low Findings** | 1 |

---

## Summary

The CUET portal runs on NIC's S3Waas platform with a generally strong security posture — HSTS, X-Content-Type-Options, X-Frame-Options, Permissions-Policy, and a Content Security Policy are all present. However, the CSP is missing a critical `script-src` directive, which means there is no CSP-based protection against cross-site scripting attacks. This technical gap is compounded by NTA's documented institutional failures: the NEET PG 2025 data breach exposed personal details of over 130,000 medical aspirants (sold online for as little as Rs. 15,000), and NTA's exam paper leak scandals have led to Supreme Court intervention.

---

## Risk Factors

- **CSP missing script-src** — no CSP-based XSS protection on the portal
- **Confirmed 2025 data breach** — NEET PG candidate data sold on Telegram and dark web
- **NTA paper leak history** — NEET UG 2024, CUET paper leaks, exam cancellations
- **jQuery + WPBakery** — outdated jQuery 3.6.4 with migrate plugin and WPBakery page builder
- **Varnish cache headers exposed** — reveals caching infrastructure details

---

## Findings Overview

| # | Severity | Category | Finding |
|---|----------|----------|---------|
| 1 | CRITICAL | CSP Gap | No `script-src` directive in CSP — no XSS protection via Content Security Policy |
| 2 | HIGH | Confirmed Data Breach | NEET PG 2025 candidate data (names, ranks, scores, contact details) sold online |
| 3 | HIGH | Exam Integrity Failures | NEET UG 2024 paper leak, CUET paper leaks, centre disruptions |
| 4 | MEDIUM | Outdated Dependencies | jQuery 3.6.4 with migrate plugin; WPBakery (js_composer) 8.7.2 |
| 5 | MEDIUM | Infrastructure Disclosure | X-Varnish, X-Cache, X-Cache-Hits headers expose caching layer |
| 6 | LOW | Static Parent Domain | nta.nic.in last modified June 2020 — abandoned, no security headers |

---

## Impact Scenarios

### Scenario 1: XSS via Missing script-src

The CUET portal's CSP includes directives for images, connections, frames, forms, and workers — but omits `script-src`. Without this directive, any JavaScript can execute on the page, rendering the entire CSP ineffective against XSS attacks. A hypothetical attacker who finds a reflected or stored XSS vector (perhaps through the WordPress comment system, a form field, or a plugin vulnerability) could inject scripts that steal session cookies, redirect students to phishing pages during exam registration, or modify displayed content. During the high-stress registration period for CUET, a fake "payment failed" notification injected via XSS could trick students into re-entering credentials on a lookalike page.

### Scenario 2: Data Breach Cascade

The NEET PG 2025 data breach demonstrates that NTA's data handling practices are compromised. Candidate data — including application IDs, email addresses, phone numbers, exam scores, rank, and department preferences — was reportedly sold online for Rs. 15,000 per dataset. The data appeared on Telegram channels and web listings. If the same data pipeline serves CUET, JEE, and other NTA examinations (which is likely given NTA's centralised architecture), the breach scope could extend to millions of students across all NTA exams. A hypothetical data broker could correlate CUET scores with NEET PG rank lists to build comprehensive profiles of students from undergraduate through postgraduate medical education.

### Scenario 3: Exam Integrity Undermined

NTA's paper leak history (NEET UG 2024, CUET disruptions) has already eroded public trust. The technical security of the portal is only one layer — if question papers can be leaked before the exam and candidate data can be sold after the exam, the entire examination ecosystem is compromised. Students from economically disadvantaged backgrounds, who depend on fair examination processes for social mobility, are disproportionately affected.

---

## Technical Analysis

### Content Security Policy — Missing script-src

The portal's CSP covers multiple directives but critically omits `script-src`:

```
img-src 'self' *.google-analytics.com img.youtube.com *.s3waas.gov.in ...
connect-src 'self' *.s3waas.gov.in *.google-analytics.com ...
object-src 'none'
media-src 'self' *.s3waas.gov.in data:
frame-src 'self' www.google.com platform.twitter.com www.facebook.com ...
form-action *.s3waas.gov.in 'self'
upgrade-insecure-requests
```

Without `script-src`, the CSP default behaviour allows all script execution. This is equivalent to having no script-level CSP protection at all. The `upgrade-insecure-requests` directive and `object-src 'none'` provide some protection, but XSS remains the web's most common attack vector and this gap negates much of the CSP's value.

### WordPress Stack

The site runs on NIC's S3Waas (Simplified, Scalable, Secure, Accessible, Affordable, Sustainable) WordPress platform. Detected components:

- **js_composer (WPBakery)** 8.7.2 — page builder with a history of XSS and auth bypass CVEs
- **jQuery** 3.6.4 with jquery-migrate 3.4.1 — migration plugin suggests legacy code dependencies
- **awaas-accessibility** plugin 6.9.4 — S3Waas accessibility toolkit
- **Bhashini translation** — government language translation integration
- **sdo-theme** — S3Waas theme with bundled libraries (fancybox, flexslider)

### Security Headers (Present)

To its credit, the S3Waas platform provides:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — restrictive (camera, microphone, geolocation, payment all blocked)
- `Expect-CT: enforce,max-age=2592000` (deprecated but present)

### NEET PG 2025 Data Breach

According to multiple news reports (India Today, Shiksha, MSN, Health Voice):
- **Date**: October 2025 (ahead of counselling)
- **Scope**: 130,000+ NEET PG candidates
- **Data exposed**: Names, addresses, contact numbers, roll numbers, exam scores, ranks, department preferences, email IDs
- **Sale price**: Rs. 15,000 per dataset on Telegram and dark web listings
- **NTA/NBEMS response**: NBEMS denied fault, suggesting the leak occurred elsewhere
- **Impact**: Students received unsolicited calls from "counsellors" who knew their exact ranks and scores

---

## Why This Matters

NTA conducts examinations that determine the career trajectories of millions of Indian students each year. The NEET UG alone had 2.4 million registrants in 2024. CUET covers admissions to 250+ universities. When the examination authority's data handling practices lead to candidate data being sold on Telegram, the social contract between the state and the student is broken.

The technical gap (missing script-src) is easily fixable. The institutional gap — repeated paper leaks, data breaches, and accountability failures — is far more serious and requires systemic reform.

Related analyses:
- [National Scholarship Portal](/blog/nsp-scholarship-security-analysis/) — education sector security
- [NEET/NTA](/blog/neet-nta-security-analysis/) — NTA infrastructure analysis
- [AIIMS Delhi](/blog/aiims-security-analysis/) — medical institution security

---

## Recommendations

### Immediate

1. **Add `script-src` to CSP** — Use `script-src 'self'` as minimum; prefer nonce-based approach
2. **Investigate NEET PG data breach source** — Determine whether NTA, NBEMS, or a downstream vendor leaked the data
3. **Notify affected candidates** — Per IT Act 2000 Section 43A and DPDP Act obligations

### Short-term

4. **Update jQuery** — Remove jquery-migrate dependency; upgrade to latest jQuery
5. **Audit WPBakery plugin** — Review js_composer for known CVEs; restrict access
6. **Add incident response process** — NTA has no public security incident response policy

### Structural

7. **Establish NTA Vulnerability Disclosure Program** — No channel exists for researchers
8. **Data access audit** — Determine who has access to candidate databases and implement least-privilege
9. **Encryption at rest** — Candidate data (scores, ranks, PII) should be encrypted in storage
10. **Third-party vendor audit** — If NBEMS or other vendors handle data, enforce contractual security obligations
11. **Parliamentary oversight** — Given repeated failures, NTA's data security practices warrant parliamentary review

---

*This is analysis #39 in an ongoing series examining the security architecture of India's digital public infrastructure.*

*Dashboard: [govt-security-audit](https://cashlessconsumer.zo.space/govt-security-audit)*
