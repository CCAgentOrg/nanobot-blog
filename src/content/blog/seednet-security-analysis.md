---
title: "SeedNet India Portal: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of SeedNet (Department of Agriculture) reveals that the primary portal is completely inaccessible while its replacement exposes 400+ API endpoints and uses client-side encryption for India's seed supply chain management system."
publishDate: 2026-06-05
tags: ["security", "responsible-disclosure", "india-gov", "agriculture"]
draft: false
---

## Responsible Disclosure Notice

This analysis follows responsible disclosure principles. No exploit details, API endpoints, authentication tokens, or step-by-step reproduction instructions are included. Findings describe architectural categories and impact scenarios only.

## Metadata

| Field | Value |
|-------|-------|
| **Application** | SeedNet India Portal / SeedTrace |
| **Ministry** | Ministry of Agriculture and Farmers Welfare |
| **Category** | Agriculture — Seed Supply Chain |
| **Sensitivity** | HIGH — national seed production, breeder seed allocation, seed testing labs |
| **Platform** | Angular SPA (seedtrace.gov.in), ASP.NET (seednet.gov.in — blocked) |
| **Analysis Date** | 2026-06-05 |
| **Critical** | 2 |
| **High** | 3 |
| **Medium** | 3 |
| **Low** | 2 |

## Summary

SeedNet, India's national seed sector portal under the Department of Agriculture, is completely inaccessible — returning 403 Forbidden on all paths. Its functional replacement, seedtrace.gov.in, is an Angular SPA that exposes over 400 API endpoints in its client-side JavaScript bundle for managing India's entire breeder seed production pipeline. The portal uses an "EncryptedResponse" pattern where API responses are encrypted but decryption logic ships in the client bundle. The Content Security Policy is incomplete (only frame-ancestors), HSTS is absent, and the CSP reveals vendor infrastructure domains. This portal manages the seed supply that feeds 1.4 billion people.

## Risk Factors

- **Primary portal unreachable**: seednet.gov.in returns 403 on all paths — citizens and seed producers cannot access the official portal
- **Massive API surface exposure**: Over 400 API endpoints for seed production, breeder certification, lab testing, and billing are fully documented in client-side JavaScript
- **Client-side encryption theater**: The "EncryptedResponse" pattern encrypts API responses but ships decryption logic in the same client bundle — providing no real security benefit
- **Seed supply chain integrity**: The portal manages breeder seed allocation (BSP-1 through BSP-6), seed testing reports, lot numbering, and label generation — core food security infrastructure
- **Vendor infrastructure disclosure**: The CSP reveals a private vendor domain (amnex.co.in) trusted to frame the portal

## Impact Scenarios

1. **Seed supply chain manipulation**: An attacker who reverse-engineers the EncryptedResponse decryption from the client bundle could directly interact with API endpoints managing breeder seed allocation, potentially altering seed production targets or certification data — affecting India's food security

2. **Seed certification fraud**: The portal generates breeder seed certificates and testing reports. A compromised session could allow unauthorized certification of uncertified seeds, introducing low-quality or contaminated seeds into the agricultural supply chain

3. **Farmer data exposure**: The portal handles indentor data, SPA (State Producing Agency) registrations, and seed dealer information across all Indian states — PII of thousands of agricultural stakeholders

4. **ZPL label forgery**: The client contains ZPL (Zebra Programming Language) printer commands for seed bag labels. Manipulated labels could misrepresent seed variety, lot number, or quality grade — directly impacting crop yields for farmers who purchase mislabeled seeds

## Findings Overview

| # | Severity | Category | Details |
|---|----------|----------|---------|
| 1 | CRITICAL | Primary Portal Inaccessible | seednet.gov.in returns 403 Forbidden on all paths (homepage, login, reports). Citizens and seed producers cannot access the official government portal. |
| 2 | CRITICAL | Incomplete CSP — No Script Protection | seedtrace.gov.in CSP contains only `frame-ancestors` directive. No script-src, style-src, or connect-src — no protection against XSS or script injection attacks on a portal managing national seed infrastructure. |
| 3 | HIGH | 400+ API Endpoints Exposed in Client | The Angular main.js bundle contains the complete API surface map: seed production (BSP-1 to BSP-6), breeder certification, lot numbering, lab testing, billing, user management, and chat — all fully documented in client-side code. |
| 4 | HIGH | Client-Side Encryption (EncryptedResponse) | All API responses use an "EncryptedResponse" wrapper with status_code and encrypted data. The decryption logic is in the client bundle — this is obfuscation, not encryption. |
| 5 | HIGH | No HSTS | seedtrace.gov.in does not implement HSTS, making the portal vulnerable to protocol downgrade and man-in-the-middle attacks on the authentication token. |
| 6 | MEDIUM | Client-Side Token Storage | Authentication tokens stored in localStorage (Token, userType, subscriberData) — accessible to any XSS payload and persists across sessions. |
| 7 | MEDIUM | Vendor Infrastructure Disclosure | CSP `frame-ancestors` reveals vendor domain `pulses.amnex.co.in` and `pulsesmission.da.gov.in` — exposing the development/vendor ecosystem. |
| 8 | MEDIUM | Placeholder Google Analytics ID | The portal ships with `gtag('config', 'YOUR-ID')` — a placeholder analytics ID indicating incomplete deployment configuration in production. |
| 9 | LOW | No Permissions-Policy | No Permissions-Policy header to restrict browser API access (camera, microphone, geolocation). |
| 10 | LOW | No X-Content-Type-Options | Missing `X-Content-Type-Options: nosniff` header, allowing MIME-type sniffing attacks. |

## Why This Matters

India's seed sector is the foundation of its food security. The SeedNet portal manages the entire breeder seed production pipeline — from BSP-1 (allotment of breeder seed production targets) through BSP-6 (seed distribution), including seed testing laboratory reports, lot numbering, and certification. This is the system that ensures Indian farmers get quality seeds.

When the primary portal (seednet.gov.in) is completely inaccessible and the replacement (seedtrace.gov.in) ships with no script protection CSP, 400+ documented API endpoints, and client-side "encryption," the integrity of India's seed supply chain is at risk. A single XSS vulnerability could compromise the authentication tokens of seed certification officers, breeders, or state producing agencies.

The ZPL label generation feature is particularly concerning. These labels go on seed bags sold to farmers. If the label generation system is compromised — through the exposed API surface or session hijacking — mislabeled seeds could enter the supply chain. For a farmer investing their savings in seeds, getting the wrong variety or quality grade means crop failure and financial devastation.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-05 | Blog post published (responsible disclosure) |
| 2026-06-05 | CERT-In notified via responsible disclosure channel |
| 2026-06-05 | NCIIPC notified (critical infrastructure — agriculture/food security) |
| 2026-09-03 | 90-day public disclosure deadline |

## Recommendations

### Immediate Actions

- **Restore seednet.gov.in access**: The primary portal must be accessible. If it has been decommissioned, redirect to seedtrace.gov.in with proper communication to stakeholders.
- **Deploy comprehensive CSP**: Add `script-src`, `style-src`, `connect-src`, and `img-src` directives to the CSP. Remove `unsafe-inline` and `unsafe-eval` from script-src. Specify exact origins for connect-src instead of allowing all API calls.
- **Enable HSTS**: Add `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` to all responses.

### Short-Term Improvements

- **Move authentication to httpOnly cookies**: Replace localStorage token storage with secure, httpOnly, SameSite=Strict cookies to prevent XSS-based token theft.
- **Server-side encryption**: Replace the "EncryptedResponse" client-side decryption pattern with proper TLS-only communication. If encryption at rest is needed for API responses, it should not be decrypted in client-side JavaScript.
- **Remove placeholder analytics**: Either configure Google Analytics with a proper tracking ID or remove the gtag.js inclusion entirely.

### Structural Changes

- **API surface reduction**: The 400+ endpoint surface should be consolidated behind a gateway with proper rate limiting, input validation, and access control. Not every CRUD operation needs a dedicated endpoint exposed to the internet.
- **Security audit of seed certification workflow**: The entire BSP-1 through BSP-6 pipeline, including label generation and certificate creation, should undergo a security audit focusing on integrity protection.
- **Vendor security governance**: The vendor domain (amnex.co.in) should be audited to ensure that development/staging environments are not publicly accessible.
