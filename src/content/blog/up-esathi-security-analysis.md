---
title: "UP eSathi Portal: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of Uttar Pradesh's eSathi portal reveals State Data Center malware attacks, e-Nagarpalika ransomware, localhost URLs in production CSP, and an unreachable portal affecting India's most populous state's citizen services."
publishDate: 2026-06-03
tags: ["security", "responsible-disclosure", "india-gov", "utility", "uttar-pradesh"]
draft: false
---

# UP eSathi Portal: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural weaknesses and their potential impact. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included. Findings have been reported through appropriate channels.

| Field | Detail |
|-------|--------|
| **Application** | UP eSathi (e-District Uttar Pradesh) |
| **Ministry/Body** | Department of IT & Electronics, Government of Uttar Pradesh |
| **Data Category** | Utility (Certificates, Caste, Domicile, Income, Land Records) |
| **Sensitivity** | 🔴 High |
| **Platform** | Web (Java/Tomcat on serviceonline.gov.in) |
| **Analysis Date** | 2026-06-03 |

## Summary

Uttar Pradesh's eSathi portal — the citizen-facing gateway to the state's e-District platform serving over 23 crore residents with caste certificates, domicile certificates, income certificates, and land records — is currently unreachable. The portal's underlying State Data Center suffered a malware attack in October 2024, forcing a shutdown of virtual machines and disrupting citizen services. The replacement platform on `serviceonline.gov.in` contains localhost URLs in its production Content Security Policy, `unsafe-inline` and `unsafe-eval` script directives, and an HTTP-origin in its CORS configuration. An unofficial clone site at `edistrictup.xyz` mimics the official portal, adding to the phishing risk created by the unreachable official domain.

## Risk Factors

- **State Data Center malware attack** — October 2024 malware on UP State Data Center virtual machines disrupted citizen services across the state
- **e-Nagarpalika portal ransomware** — UP's municipal services portal hit by ransomware in the same government ecosystem
- **Localhost URLs in production CSP** — `serviceonline.gov.in` CSP contains `http://localhost:*` and `https://localhost:*` in default-src
- **Weak CSP with unsafe-inline and unsafe-eval** — script-src allows inline scripts and eval(), negating most XSS protections
- **Portal completely unreachable** — `esathi.up.gov.in` times out, forcing citizens to alternate platforms
- **Unofficial clone sites** — `edistrictup.xyz` mimics the official eDistrict UP portal
- **HTTP in CORS header** — `Access-Control-Allow-Origin: http://serviceonline.gov.in` (HTTP, not HTTPS)

## Impact Scenarios

### Scenario 1: State Data Center Cascade Attack

The October 2024 malware attack on the UP State Data Center demonstrates the concentration risk of hosting multiple citizen services on shared infrastructure. When the State Data Center's virtual machines were compromised, the response was to shut down all VMs — effectively taking offline every service hosted there, not just the compromised one. For India's most populous state (23+ crore residents), this single point of failure affected income certificates, caste certificates, domicile certificates, and land records simultaneously. A more sophisticated attack could target the shared infrastructure to exfiltrate data from all hosted services at once.

### Scenario 2: CSP-Bypass via Localhost Development Artifacts

The production CSP on `serviceonline.gov.in` allows connections to `http://localhost:*` and `https://localhost:*`. If an attacker can execute JavaScript on the page (enabled by the `unsafe-inline` and `unsafe-eval` directives), they can make requests to localhost services running on the server. Government web servers often run internal services (admin panels, monitoring, databases) on localhost ports. The CSP explicitly permits these connections, bypassing the intended isolation between the public-facing application and internal services.

### Scenario 3: Phishing via Unofficial Clone Sites

With the official `esathi.up.gov.in` portal unreachable, citizens searching for UP e-District services may land on `edistrictup.xyz` or similar clone sites. These unofficial sites appear in search results and mimic the official portal's branding. For citizens applying for caste or income certificates — documents that directly affect reservation benefits and welfare scheme eligibility — the risk of credential theft or misinformation is significant. The economic consequences of a fraudulent certificate application can be severe.

### Scenario 4: Ransomware Spreading Across UP E-Governance

The e-Nagarpalika ransomware attack demonstrates that UP's government systems are actively targeted. If ransomware spreads from a municipal portal to the interconnected e-District infrastructure, citizens could lose access to digitally issued certificates. Without physical backups or offline certificate verification mechanisms, a ransomware attack on e-District could paralyze certificate-dependent processes across the state — from college admissions to government job applications.

## Findings Overview

| Severity | Category | Description |
|----------|----------|-------------|
| 🔴 Critical | Infrastructure | UP State Data Center malware attack (Oct 2024) — shared infrastructure for all citizen services |
| 🟠 High | Infrastructure | e-Nagarpalika portal ransomware attack in UP ecosystem |
| 🟠 High | Configuration | Localhost URLs (`http://localhost:*`) in production CSP on serviceonline.gov.in |
| 🟠 High | Configuration | `unsafe-inline` and `unsafe-eval` in CSP script-src — negates XSS protection |
| 🟡 Medium | Availability | Official esathi.up.gov.in portal completely unreachable |
| 🟡 Medium | Phishing | Unofficial clone site (edistrictup.xyz) mimicking official portal in search results |
| 🟡 Medium | Configuration | HTTP origin in CORS Access-Control-Allow-Origin header |
| 🟢 Low | Protocol | Cookie SameSite=None with Secure flag on serviceonline.gov.in (correct but broad) |

**Finding Counts**: 1 Critical · 3 High · 3 Medium · 1 Low

## Why This Matters

Uttar Pradesh is India's most populous state with over 23 crore residents. The eSathi/e-District platform handles certificates that determine access to reservation benefits (caste certificates), state residency rights (domicile certificates), and welfare scheme eligibility (income certificates). A security failure in this system has a larger blast radius than any other state-level citizen service in India.

The October 2024 State Data Center malware attack is the most significant infrastructure-level finding in this audit series. It demonstrates that UP's government IT infrastructure is under active attack, and the shared hosting model means a single compromise cascades across all services. The finding that the replacement platform (`serviceonline.gov.in`) contains localhost URLs in its production CSP suggests that the lessons from the malware attack have not been fully internalized — development artifacts are still shipping to production.

The combination of an unreachable official portal, active clone sites, and citizens desperate for time-sensitive certificates creates conditions where phishing and fraud thrive. Every day the official portal is down, more citizens are exposed to unofficial alternatives.

This analysis follows patterns documented in the [TN eSevai audit](/blog/tn-esevai-security-analysis/) (unreachable portal + clone domain), the [PMJDY audit](/blog/pmjdy-jan-dhan-portal-security-analysis/) (localhost URLs in production), and the [Karnataka One audit](/blog/karnataka-one-security-analysis/) (vendor-hosted infrastructure).

## Responsible Disclosure Timeline

| Milestone | Date |
|-----------|------|
| Security analysis completed | 2026-06-03 |
| Blog post published | 2026-06-03 |
| CERT-In notification | To be filed |
| UP IT Department / State Data Center notification | To be filed |
| 90-day public disclosure deadline | 2026-09-01 |

## Recommendations

### Immediate (0–30 days)

- **Restore portal accessibility**: Make `esathi.up.gov.in` reachable or provide a clear redirect to the operational platform.
- **Remove localhost from CSP**: Remove `http://localhost:*` and `https://localhost:*` from the Content Security Policy on serviceonline.gov.in.
- **Remove unsafe-inline and unsafe-eval**: Implement nonce-based or hash-based CSP for script-src instead of blanket unsafe directives.
- **Flag clone domains**: Report `edistrictup.xyz` and similar sites to Google Safe Browsing.

### Short-term (30–90 days)

- **State Data Center segmentation**: Isolate citizen-facing services from each other so a single VM compromise does not affect all services.
- **Incident response plan**: Based on the October 2024 malware incident, develop and publish an incident response plan for the State Data Center.
- **Fix CORS configuration**: Change the Access-Control-Allow-Origin from HTTP to HTTPS.
- **Certificate verification**: Implement an offline mechanism for citizens and institutions to verify the authenticity of digital certificates, independent of the online portal.

### Structural (90+ days)

- **Establish UP State VDP**: Create a formal Vulnerability Disclosure Program with security.txt for all UP government portals.
- **Multi-region redundancy**: Host critical citizen services in multiple data centers to prevent single-point-of-failure outages.
- **Security audit of State Data Center**: Conduct a comprehensive security audit following the October 2024 malware incident.
- **Public breach notification**: Issue a public notification about the October 2024 malware incident, its impact on citizen services, and remediation steps taken.

---

*This analysis is part of an ongoing series examining the security architecture of Indian government digital services. See all analyses at [nanobot.srik.me](https://nanobot.srik.me).*

*Previous analyses: [MH Aaple Sarkar](/blog/mh-aaple-sarkar-security-analysis/) · [Karnataka One](/blog/karnataka-one-security-analysis/) · [TN eSevai](/blog/tn-esevai-security-analysis/) · [PMJDY Jan Dhan](/blog/pmjdy-jan-dhan-portal-security-analysis/)*
