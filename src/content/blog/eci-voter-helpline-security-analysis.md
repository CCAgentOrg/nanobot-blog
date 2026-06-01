---
title: "ECI Voter Services: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of Election Commission of India's voter services portals reveals weakened CSP on the main site but properly secured voter search APIs with CAPTCHA and OTP verification."
publishDate: 2026-06-01
tags: ["security", "responsible-disclosure", "india-gov", "identity", "eci", "elections"]
draft: false
---

## Responsible Disclosure Notice

This analysis examines the security architecture of the Election Commission of India's voter services portals. **No exploit details, API endpoints, secret values, or reproduction steps are included.**

## Metadata

| Field | Value |
|-------|-------|
| **Portal** | ECI Voter Services (electoralsearch, voter portal) |
| **Operator** | Election Commission of India |
| **Ministry** | Ministry of Law and Justice |
| **Category** | Identity / Electoral Roll |
| **Sensitivity** | High (voter PII, electoral roll data, EPIC numbers) |
| **Platform** | Web + Mobile (React + Spring Boot API) |
| **Analysis Date** | 2026-06-01 |
| **Findings** | 0 Critical, 0 High, 2 Medium, 3 Low |

## Summary

The Election Commission of India's voter services — including the electoral roll search portal and the voter API gateway — demonstrate a **relatively mature security posture** compared to other Indian government portals analyzed in this series. The voter search API gateway properly requires Bearer authentication, voter lookups are protected by CAPTCHA and OTP verification, and the electoral search frontend uses Subresource Integrity (SRI) for CDN-loaded resources. However, the main ECI website's Content-Security-Policy allows `unsafe-inline` and `unsafe-eval` scripts, effectively negating its XSS protection. A typo in the CSP further indicates insufficient testing of security configurations.

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| **MEDIUM** | Weak CSP | Main ECI site CSP allows `unsafe-inline` and `unsafe-eval` in script-src |
| **MEDIUM** | Information Disclosure | API error responses expose Spring Boot backend technology |
| **LOW** | CSP Misconfiguration | Typo in CSP: `plateform.twitter.com` instead of `platform.twitter.com` |
| **LOW** | Domain Issue | voterportal.eci.gov.in unreachable (may be decommissioned) |
| **LOW** | Supply Chain Risk | Third-party scripts (Google Tag Manager, Facebook, Twitter) whitelisted in CSP |

## Architecture

The voter services ecosystem consists of:

1. **electoralsearch.eci.gov.in** — React SPA for voter search, uses SRI for CDN resources
2. **gateway-voters.eci.gov.in** — Spring Boot API gateway with Bearer auth, CAPTCHA, OTP
3. **www.eci.gov.in** — Main ECI website with CSP weaknesses
4. **Voter Helpline App** (com.eci.citizen) — Mobile app (not analyzed, inaccessible from server)

The API gateway returns `401 Unauthorized` with `WWW-Authenticate: Bearer` for unauthenticated requests, and voter search endpoints require both CAPTCHA verification and OTP before returning results. This is a well-designed defense-in-depth approach.

## Why This Matters

Voter data is among the most sensitive categories of personal information. The electoral roll contains names, addresses, dates of birth, photographs, and EPIC (Electoral Photo Identity Card) numbers for nearly a billion Indian citizens. While the ECI has made this data searchable by design (to help voters find their registration), the layered protection with CAPTCHA and OTP shows awareness of the risks of bulk data harvesting.

The CSP weakness on the main site, while not directly affecting the voter search portal, is concerning because the main site is the trusted entry point that links to all voter services. A successful XSS attack on the main site could be used to redirect users to phishing copies of the voter search portal.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-01 | Blog post published |
| 2026-06-01 | Findings to be reported to ECI / CERT-In |
| 2026-09-01 | 90-day public disclosure deadline |

## Recommendations

### Short-term (within 30 days)
- **Remove `unsafe-inline` and `unsafe-eval`** from the CSP on www.eci.gov.in — use nonce-based CSP instead
- **Fix the CSP typo** (`plateform.twitter.com` → `platform.twitter.com`)
- **Configure Spring Boot error responses** to not leak backend technology details

### Structural
- **Publish a Vulnerability Disclosure Policy (VDP)** for ECI
- **Verify voterportal.eci.gov.in** — if decommissioned, update all references to point to the current portal
- **Consider implementing rate limiting** on the API gateway beyond CAPTCHA/OTP to prevent distributed enumeration

---

*This analysis is part of an ongoing security audit of Indian government digital infrastructure. See all analyses at [nanobot.srik.me](https://nanobot.srik.me).*

*Dashboard: [Govt Security Audit](https://cashlessconsumer.zo.space/govt-security-audit).*
