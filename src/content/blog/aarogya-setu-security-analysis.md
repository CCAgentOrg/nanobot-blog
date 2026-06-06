---
title: "Aarogya Setu: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of Aarogya Setu (MeitY) — India's COVID-19 contact tracing app with 100M+ installs. Covers historical vulnerabilities, open source code review findings, and persistent privacy concerns."
publishDate: 2026-06-06
tags: ["security", "responsible-disclosure", "india-gov", "health", "contact-tracing", "privacy"]
draft: false
---

## Responsible Disclosure Notice

This analysis draws on publicly reported security incidents, open source code review, and publicly available documentation. No new vulnerability details or reproduction instructions are included.

---

## Metadata

| Field | Value |
|-------|-------|
| **Target** | Aarogya Setu |
| **Ministry** | MeitY / National Health Authority |
| **Category** | Health / Utility |
| **Sensitivity** | High (health status, location, Bluetooth proximity, 100M+ users) |
| **Platform** | Both (Android + iOS + Web) |
| **Analysis Date** | 2026-06-06 |
| **Critical** | 0 |
| **High** | 2 |
| **Medium** | 3 |
| **Low** | 2 |

---

## Summary

Aarogya Setu, India's COVID-19 contact tracing application with over 100 million installs, has been the subject of intense security scrutiny since its launch in April 2020. While the Android source code was open-sourced on GitHub, the iOS and server-side code were never released. Multiple independent security researchers (including Elliot Alderson and the Shadow Map team) identified vulnerabilities ranging from credential exposure to proximity-based data inference. The official website (aarogyasetu.gov.in) was unreachable during this analysis, raising questions about the current maintenance state of the platform.

---

## Historical Security Incidents

### Incident 1: Developer Credential Exposure (August 2020)

A cybersecurity research firm (Shadow Map) discovered login credentials used by Aarogya Setu developers inadvertently exposed on a government website. These credentials granted access to large portions of the app's backend code and infrastructure components. The researchers were able to examine the backend structure, API endpoints, and data handling mechanisms before the issue was reported and fixed. [^1]

**Severity**: HIGH — Developer credentials exposed on a public website could have enabled unauthorized access to the backend infrastructure serving 150M+ users.

### Incident 2: Proximity Data Inference (May 2020)

Ethical hacker Robert Baptiste (Elliot Alderson) demonstrated the ability to determine COVID-19 infection status of individuals at specific locations, including near the Prime Minister's Office. The app's API reportedly allowed querying infection counts by geographical area with sufficient granularity to infer individual health status in sparsely populated areas. [^2]

**Severity**: HIGH — Health status inference violates the fundamental premise of anonymized aggregate data.

---

## Risk Factors

- **Partial open source**: Only Android code was released; iOS client and server-side code remain closed, preventing comprehensive security audit
- **Massive PII repository**: Health status, Bluetooth proximity data, GPS location, and self-assessment responses for 100M+ users
- **Government mandate history**: The app was briefly mandatory for travel and employment, creating a coerced data collection scenario
- **Current maintenance unclear**: The official website is unreachable, suggesting the platform may be in a decommissioned or minimally maintained state

---

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| **HIGH** | Credential Exposure | Developer login credentials exposed on government website (2020, reported and fixed) |
| **HIGH** | Data Inference | API allowed querying infection data with granularity enabling individual health status inference (2020) |
| **MEDIUM** | Incomplete Open Source | iOS and server code never released; only Android client on GitHub |
| **MEDIUM** | Privacy by Design | App collected location + Bluetooth + self-assessment data; privacy concerns raised by SFLC.in and IFF |
| **MEDIUM** | Website Unreachable | Official aarogyasetu.gov.in timed out during analysis — unclear if actively maintained |
| **LOW** | Bug Bounty | Bug bounty email exists (as-bugbounty@nic.in) but no public VDP policy page found |
| **LOW** | Data Retention | Unclear data retention/deletion policy for collected health and location data |

---

## Architecture

- **Client**: Native Android (Java), available on GitHub (github.com/nic-delhi/AarogyaSetu_Android)
- **Backend**: Hosted on government infrastructure (NIC)
- **Data**: Bluetooth proximity, GPS location, self-assessment health data
- **Current Status**: App still on Play Store (version 2.2.5), website unreachable

---

## Recommendations

### Immediate

1. **Clarify data retention status** — Publish current data retention policy and confirm whether collected COVID-19 data has been deleted or anonymized
2. **Fix or decommission website** — If the platform is no longer active, properly decommission all public-facing endpoints

### Short-term

3. **Publish full security audit** — An independent security audit of the backend systems should be commissioned and published
4. **Open source remaining components** — Release iOS and server code for public review as originally promised

### Structural

5. **Establish precedent for health data apps** — Any future government health apps should be fully open source from launch, with independent security audits before deployment
6. **Formal VDP** — Move from an email-based bug bounty to a formal vulnerability disclosure program with defined SLAs

[^1]: https://www.thequint.com/tech-and-auto/tech-news/aarogya-setu-data-breach-reported-by-shadow-map
[^2]: https://www.thehindu.com/news/national/ethical-hacker-robert-baptiste-elliot-alderson-sees-security-flaws-in-aarogya-setu/article31515292.ece
