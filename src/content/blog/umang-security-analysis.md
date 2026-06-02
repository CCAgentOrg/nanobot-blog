---
title: "UMANG Portal: Security Architecture Analysis & Responsible Disclosure"
description: "Analysis of India's UMANG platform (web.umang.gov.in) reveals a Content Security Policy that trusts hardcoded internal IP addresses, test payment gateways, and staging domains — a production configuration crisis affecting 71 million users of 2,000+ government services."
publishDate: 2026-06-02
draft: false
---

UMANG (Unified Mobile Application for New-age Governance) is India's single-platform gateway to 2,132 government services from 207 departments across 32 states, serving 7.12 crore (71.2 million) registered users. Operated by MeitY's National e-Governance Division (NeGD), it is arguably the most consequential citizen-facing digital platform in India. This analysis examines the security architecture of its web portal.

---

## Responsible Disclosure Notice

This analysis is based on publicly observable HTTP headers — specifically the Content Security Policy returned by web.umang.gov.in. No exploitation was performed. No authentication was bypassed. No private data was accessed. All findings are derived from the CSP directive, which is served to every browser that visits the portal.

---

## Metadata

| Field | Value |
|-------|-------|
| **Portal** | UMANG |
| **Domain** | web.umang.gov.in |
| **Ministry** | MeitY (Ministry of Electronics & IT) |
| **Category** | Government Services Aggregator |
| **Platform** | Web (Angular on AWS S3 + CloudFront) |
| **Data Sensitivity** | **Critical** — Aadhaar, PAN, bank accounts, health records, tax data |
| **Users** | 71.2 million registered (as of March 2025) |
| **Services** | 2,132 government services |
| **Analysis Date** | 2026-06-02 |
| **Critical Findings** | 2 |
| **High Findings** | 2 |
| **Medium Findings** | 2 |
| **Low Findings** | 1 |

---

## Summary

The UMANG web portal's Content Security Policy — the primary browser-level defence against cross-site scripting and data injection attacks — contains hardcoded internal IP addresses, test payment gateway URLs, and staging/UAT domain references. These entries, present in the production CSP's `script-src`, `connect-src`, `frame-src`, `style-src`, and `font-src` directives, indicate that development, testing, and staging configurations were promoted to production without sanitisation. Any of these trusted origins could serve malicious JavaScript that the browser would happily execute on the UMANG portal, potentially compromising the sessions of 71 million users accessing Aadhaar-linked government services.

---

## Findings Overview

| # | Severity | Category | Finding |
|---|----------|----------|---------|
| 1 | CRITICAL | Internal IP in Production CSP | Hardcoded IP `125.21.22.149:8585` (BSNL) trusted for scripts, connections, frames, styles, fonts, images |
| 2 | CRITICAL | Test Payment Gateways in Production | `test.payu.in`, `apitest.payu.in`, `acssimuat.payubiz.in` trusted in production CSP |
| 3 | HIGH | Staging/UAT Domains in Production | `uat.ai.umangapp.in`, `stgweb.umang.gov.in` trusted in production CSP |
| 4 | HIGH | Unsafe CSP Directives | `unsafe-inline` and `unsafe-eval` in `script-src` |
| 5 | MEDIUM | Overly Permissive CSP | 100+ trusted origins across directives; massive attack surface |
| 6 | MEDIUM | Third-party Integration Sprawl | Firebase, BillDesk, PayU, MapMyIndia, Bhashini, PowerBI, API Setu, Amrita AI chatbot all trusted |
| 7 | LOW | Infrastructure Disclosure | CloudFront headers (x-cache, x-amz-cf-pop, x-amz-cf-id) reveal CDN topology |

---

## Impact Scenarios

### Scenario 1: Internal IP Compromise

The production CSP trusts `https://125.21.22.149:8585` — a hardcoded IP address on port 8585, belonging to BSNL's network range. This IP is trusted for **all CSP directives**: scripts, styles, images, fonts, frames, and connections. In a real-world scenario, if this server is decommissioned (the BSNL IP is reassigned), an attacker who gains control of the new host at this IP could serve malicious JavaScript to every UMANG visitor. Since the CSP explicitly trusts this origin, the browser would execute the payload without any CSP violation. The payload could steal Aadhaar-linked session tokens, redirect users to phishing pages, or exfiltrate form data entered into government service forms.

### Scenario 2: Test Payment Gateway Attack

The CSP trusts `test.payu.in`, `apitest.payu.in`, and `acssimuat.payubiz.in` — these are **PayU and PayUbiz test/sandbox environments**. Test payment gateways typically have relaxed security controls (simplified authentication, verbose error messages, test API keys). If an attacker discovers a vulnerability on the test PayU domain (which is designed for testing, not security), they could use it as an injection vector into the UMANG portal. Since test environments are often less monitored than production, the attack could persist undetected.

### Scenario 3: Staging Domain Takeover

The CSP trusts `stgweb.umang.gov.in` and `uat.ai.umangapp.in` — staging and UAT domains. Staging environments are frequently deployed on ephemeral infrastructure. If a staging domain's DNS record is not maintained after testing, it becomes a candidate for subdomain takeover. An attacker who registers the decommissioned subdomain could serve content that the production CSP explicitly trusts — a textbook CSP bypass.

---

## Technical Analysis

### Content Security Policy — The Complete Picture

The UMANG CSP is one of the longest we have encountered in this audit series. Key observations:

**Trusted in script-src (JavaScript execution allowed):**
- `https://125.21.22.149:8585` — hardcoded internal IP
- `https://test.payu.in` — PayU test environment
- `https://apitest.payu.in` — PayU API test environment
- `https://acssimuat.payubiz.in` — PayUbiz UAT simulator
- `uat.ai.umangapp.in` — UAT domain (no scheme, no https://)
- `'unsafe-inline'` — inline scripts allowed
- `'unsafe-eval'` — eval() and similar allowed

**Trusted in connect-src (network connections allowed):**
- All of the above, plus `https://apis.mapmyindia.com`, `https://meity-auth.ulcacontrib.org/`, `wss://ai.umangapp.in`

**Trusted in frame-src (iframe embedding allowed):**
- `https://125.21.22.149:8585` — internal IP trusted for framing
- `youtube.com` — bare domain (no https://)
- `http://www.youtube.com` — HTTP (not HTTPS) YouTube embedding

**Notable absences:**
- No `upgrade-insecure-requests` directive
- No `base-uri` restriction
- No `form-action` restriction (separate from the one in default-src)

### Infrastructure

- **Hosting**: AWS S3 with server-side encryption (AES256) + CloudFront CDN
- **Frontend**: Angular (Material Design) + Bootstrap
- **Backend API**: `apigw.umang.gov.in` / `apigw.umangapp.in`
- **AI Chatbot**: Amrita Create AI (multiple `.web.app` domains) + Senseforth AI
- **Payments**: BillDesk + PayU (production and test environments)
- **Identity**: DigiLocker integration, API Setu (social.api-setu.in)
- **Analytics**: Google Analytics, Google Tag Manager, DoubleClick
- **Maps**: MapMyIndia APIs
- **Translation**: Bhashini (dhruva-api.bhashini.gov.in)

### Security Headers (Present)

- `Strict-Transport-Security: max-age=63072000; includeSubdomains; preload` — strong HSTS (2 years)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: Sameorigin`
- `X-XSS-Protection: 1; mode=block` — deprecated but present
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self)` — minimal (only camera restricted)

---

## Why This Matters

UMANG is not just another portal. It is the **aggregator for India's entire e-governance ecosystem**. Through UMANG, 71 million users access:

- Aadhaar services (UIDAI)
- Income tax filing
- Passport services
- Health insurance (PMJAY/Ayushman Bharat)
- DigiLocker documents
- Crop insurance
- MGNREGA job cards
- EPF/ESI accounts
- Utility bill payments

A CSP bypass on UMANG could theoretically cascade into any of these 2,132 services. The hardcoded internal IP and test payment gateways in the production CSP represent not just a technical misconfiguration, but a **systemic failure in the deployment pipeline** — there is no automated check that prevents staging/test configuration from reaching production.

This is the most significant CSP misconfiguration found in this audit series to date.

---

## Recommendations

### Immediate

1. **Remove `125.21.22.149:8585` from all CSP directives** — no internal IP should be trusted in production
2. **Remove all test/UAT payment domains** — `test.payu.in`, `apitest.payu.in`, `acssimuat.payubiz.in`
3. **Remove staging domains** — `stgweb.umang.gov.in`, `uat.ai.umangapp.in`
4. **Remove `'unsafe-eval'` from script-src** — the most dangerous CSP relaxation

### Short-term

5. **Implement CSP linting in CI/CD** — automated check that rejects CSP with test/staging/internal origins
6. **Use CSP nonces instead of `unsafe-inline`** — migrate to nonce-based CSP
7. **Add `upgrade-insecure-requests`** — force HTTPS for all mixed content
8. **Fix bare `youtube.com` in frame-src** — add `https://` prefix
9. **Expand `Permissions-Policy`** — restrict microphone, geolocation, payment, USB, etc.

### Structural

10. **Separate CSP for each environment** — production, staging, and development must have distinct CSP configurations
11. **Third-party vendor audit** — every domain trusted in the CSP (30+ external domains) should be audited for security
12. **Subdomain monitoring** — monitor DNS records for staging/UAT domains to prevent takeover
13. **Establish a Vulnerability Disclosure Program** — UMANG has no public channel for security researchers

---

*This is analysis #40 in an ongoing series examining the security architecture of India's digital public infrastructure. This is the most significant CSP misconfiguration found in the series.*

*Dashboard: [govt-security-audit](https://cashlessconsumer.zo.space/govt-security-audit)*
