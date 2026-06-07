---
title: "NPCI MAP (Aadhaar Mapper) Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of NPCI MAP/Aadhaar Mapper (NPCI) reveals third-party marketing trackers on Aadhaar-linked banking infrastructure, exposed Akamai RUM credentials, and a dead primary domain."
publishDate: 2026-06-07
tags: ["security", "responsible-disclosure", "india-gov", "finance", "aadhaar"]
draft: false
---

# NPCI MAP (Aadhaar Mapper): Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | NPCI MAP (Aadhaar Mapper / BASE) |
| **Ministry/Body** | NPCI (RBI-regulated) |
| **Data Category** | Aadhaar-Bank Mapping |
| **Sensitivity** | 🟡 Medium |
| **Platform** | Web |
| **Analysis Date** | 2026-06-07 |
| **Critical** | 0 |
| **High** | 3 |
| **Medium** | 3 |
| **Low** | 1 |

## Summary

NPCI's Aadhaar Mapper service — the infrastructure that links Aadhaar numbers to bank accounts for direct benefit transfers — is served through the main npci.org.in website alongside **Facebook Pixel tracking**, **Google Ads conversion tracking** (with INR monetary values), and an **exposed Akamai Real User Monitoring API key**. The registered domain for the service (npcimap.org.in) **does not resolve**, and the actual backend (base.npci.org.in) returns a WAF rejection with **no security headers**. This is the same class of finding as our [NPCI PaySeva analysis](/blog/npci-payseva-security-analysis/) — marketing scripts on critical financial infrastructure.

## Risk Factors

- **Marketing trackers on Aadhaar infrastructure**: Facebook Pixel and Google Ads conversion tracking run on the Aadhaar mapper page — the same infrastructure that links biometric identities to bank accounts.
- **Akamai RUM credentials exposed**: The Akamai Boomerang RUM API key and CP code are visible in client-side JavaScript.
- **Origin IP leaked**: The Akamai configuration in the HTML source reveals the backend origin server IP address.
- **Dead primary domain**: The registered domain (npcimap.org.in) does not resolve in DNS, raising questions about DNS governance for critical financial infrastructure.
- **No security headers on backend**: base.npci.org.in's WAF rejection page has no CSP, no HSTS, and no Permissions-Policy.

## Impact Scenarios

### Scenario 1: Third-Party Tracking of Aadhaar Service Users
Every user visiting the NPCI Aadhaar mapper page triggers a Facebook Pixel `PageView` event and a Google Ads conversion event. If the page accepts URL parameters (e.g., a bank code or Aadhaar-related query), these could be forwarded to Facebook and Google. Over time, this creates a profile of which citizens are checking or modifying their Aadhaar-bank mappings — a sensitive financial activity. This data flows to foreign adtech companies with no data localization requirement.

### Scenario 2: Akamai RUM Key Abuse
The exposed Akamai Boomerang API key (visible in the HTML source) could be used to inject false performance data into NPCI's monitoring dashboards. If an attacker sends crafted beacon data, it could mask a real performance degradation during a high-volume DBT disbursement cycle, delaying incident response.

### Scenario 3: DNS Hijacking of Dead Domain
Since npcimap.org.in does not resolve, an attacker who gains control of the domain registration (or compromises the DNS provider) could point it to a phishing portal impersonating the Aadhaar mapper. Government documents and bank staff training materials that reference this domain would direct users to the attacker's site.

## Findings Overview

| # | Severity | Category | Finding |
|---|----------|----------|---------|
| 1 | 🟠 High | Third-party Tracking | Facebook Pixel (ID found in source) on Aadhaar mapper page |
| 2 | 🟠 High | Third-party Tracking | Google Ads conversion tracking with `value: 1, currency: "INR"` on mapper page |
| 3 | 🟠 High | Credential Exposure | Akamai Boomerang RUM API key exposed in client-side HTML |
| 4 | 🟡 Medium | Information Leak | Akamai config reveals origin server IP and CP code |
| 5 | 🟡 Medium | DNS Governance | npcimap.org.in (registered domain) does not resolve |
| 6 | 🟡 Medium | Missing Headers | base.npci.org.in has no CSP, HSTS, or Permissions-Policy |
| 7 | 🟢 Low | Missing Header | No Content-Security-Policy on npci.org.in pages |

### Positive Findings

- **HSTS**: `max-age=31536000; includeSubdomains; preload` on npci.org.in
- **Akamai WAF**: base.npci.org.in is behind Akamai WAF with request rejection
- **X-Frame-Options**: `SAMEORIGIN` on base.npci.org.in
- **X-Content-Type-Options**: `nosniff` on base.npci.org.in

## Why This Matters

This is the **second NPCI property** we've found running marketing trackers. Our previous analysis of [NPCI PaySeva](/blog/npci-payseva-security-analysis/) found the identical pattern. The Aadhaar mapper is even more sensitive — it's the backbone of India's Direct Benefit Transfer (DBT) system that routes ₹6.5 lakh crore annually to beneficiaries.

That Facebook and Google have tracking scripts on the same page where citizens manage their Aadhaar-bank linkages is a fundamental privacy violation. The [RBI's data localization directive](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx) requires payment data to stay in India — yet these trackers send behavioral data to foreign servers from pages handling Aadhaar-bank mappings.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-07 | Blog post published |
| 2026-06-07 | CERT-In notification (planned) |
| 2026-06-07 | RBI notification (planned) |
| 2026-09-05 | 90-day disclosure deadline |

## Recommendations

### Immediate (0-30 days)
- **Remove Facebook Pixel**: Remove from all NPCI pages, especially Aadhaar mapper, UPI, and payment-related pages.
- **Remove Google Ads conversion tracking**: Marketing tracking on financial infrastructure is unacceptable under RBI's data governance framework.
- **Fix npcimap.org.in DNS**: Either point the domain to the correct service or formally decommission it.

### Short-term (30-90 days)
- **Move Akamai RUM to server-side**: Boomerang API keys should not be visible in client-side HTML.
- **Add security headers to base.npci.org.in**: Implement CSP, HSTS, and Permissions-Policy even on WAF rejection pages.
- **Audit all third-party scripts**: Remove any script that isn't essential for the functioning of the financial service.

### Structural (90+ days)
- **Third-party script governance**: Establish a formal review process for any third-party JavaScript loaded on NPCI properties.
- **Privacy impact assessment**: Conduct a DPIA for all tracking currently running on NPCI infrastructure.
- **Separate marketing from operations**: If NPCI needs marketing analytics, host marketing pages on a separate domain from operational financial infrastructure.

---

*Part of the [Indian Government Portal Security Audit](/blog/) series. See the [dashboard](https://cashlessconsumer.zo.space/govt-security-audit) for progress. Related: [NPCI PaySeva Analysis](/blog/npci-payseva-security-analysis/).*
