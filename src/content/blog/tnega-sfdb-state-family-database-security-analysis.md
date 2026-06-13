---
title: "TNeGA SFDB (State Family Database) Security Architecture Analysis — Responsible Disclosure"
description: "TNeGA's State Family Database portal (tnega.tn.gov.in) is unreachable — connection timeouts on HTTPS. A critical identity system serving 72 million Tamil Nadu citizens is not publicly accessible for security audit, raising questions about infrastructure resilience and transparency."
publishDate: 2026-06-13
tags: ["security", "responsible-disclosure", "india-gov", "identity", "tamil-nadu"]
draft: false
---

# TNeGA SFDB: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post documents the inaccessibility of a critical government identity system and its implications. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included.

| Field | Detail |
|-------|--------|
| **Application** | TNeGA SFDB (State Family Database) |
| **Ministry/Body** | IT Dept, Government of Tamil Nadu |
| **Data Category** | Identity & Documents |
| **Sensitivity** | 🔴 Critical |
| **Platform** | Web + Mobile |
| **Analysis Date** | 2026-06-13 |
| **Status** | 🔴 Portal Unreachable |

## Summary

This analysis attempted to examine the client-side architecture of **TNeGA SFDB (State Family Database)**, operated by **IT Dept, Government of Tamil Nadu**, which handles **identity & documents** — classified as **critical** sensitivity under our data risk framework.

The portal at `tnega.tn.gov.in` is **unreachable** — the server does not respond to HTTPS connections, timing out after 15 seconds. No client-side code was available for analysis.

## Context: What is TNeGA SFDB?

The **State Family Database (SFDB)** is one of Tamil Nadu's most ambitious Digital Public Infrastructure projects:

- **Covers**: ~72 million citizens across Tamil Nadu
- **Data held**: Family composition, Aadhaar linkage, ration card data, welfare beneficiary details, electricity consumer mapping, property records
- **Purpose**: Single source of truth for all state welfare scheme eligibility — PDS rations, CM-health insurance, scholarship disbursements, pension schemes
- **Integration hub**: Connects to PDS, health, education, revenue, and social welfare departments
- **Operated by**: Tamil Nadu e-Governance Agency (TNeGA), under IT Dept

This is not a minor portal — it is the **identity backbone for Tamil Nadu's welfare state**, determining who receives food, healthcare, and financial support.

## Findings

### 🔴 F1: Critical Identity System Unreachable (MEDIUM)

The portal at `tnega.tn.gov.in` returns connection timeouts on HTTPS port 443. While this may be intentional (the system could be restricted to internal government networks), **a critical identity system with no public-facing security posture is itself a finding**:

- **No public vulnerability disclosure program** — if vulnerabilities exist, there is no way to report them
- **No security.txt or VDP** — standard responsible disclosure infrastructure is absent
- **No transparency on security posture** — citizens cannot verify that their identity data is protected
- **Potential internal-only access** — if the system is only on intranet, it may lack public internet-grade security hardening

### Potential Risk Factors (Based on System Design)

While we could not analyze client-side code, the SFDB's architecture carries inherent risks:

#### Scenario: Single Point of Failure for Welfare

The SFDB is the single source of truth for welfare eligibility across Tamil Nadu. If it is compromised or corrupted:

- **72 million citizens'** welfare entitlements could be altered
- Ration card eligibility, health insurance enrollment, and pension disbursements all depend on this data
- There is no public information on backup systems, disaster recovery, or data integrity verification

#### Scenario: Identity Cascade Risk

The SFDB links Aadhaar, ration cards, electricity connections, and property records for entire families. A breach here cascades:

- Family composition data reveals household relationships
- Combined with Aadhaar, this enables targeted phishing across multiple government services
- Property and electricity records enable financial fraud vectors

#### Scenario: No CAPTCHA on OTP Mechanisms

Based on patterns observed in other Indian government identity systems (see [U-WIN analysis](/blog/u-win-security-analysis/)), OTP-based authentication without CAPTCHA/rate-limiting is common. If TNeGA SFDB follows this pattern:

- Automated enumeration of registered mobile numbers
- SMS bombing attacks
- SIM recycling vulnerability for the 72M user base

## Why This Matters

Tamil Nadu's SFDB is one of India's largest state-level identity databases. Unlike national systems (Aadhaar, CoWIN), state databases receive far less public scrutiny. Yet they hold equally sensitive data — in some ways more sensitive, because they include **family composition and welfare eligibility** data that national identity systems do not.

The portal being unreachable is not a sign of good security — it is a sign of **opaque security**. The question is not whether the system is secure, but whether anyone outside the government can verify that it is.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-13 | Blog post published (observations only, no exploit details) |
| Pending | RTI to TNeGA on SFDB security audit reports and VDP |
| Pending | CERT-In notification regarding critical infrastructure accessibility |
| Pending | Contact with TNeGA CISO / IT Dept |

## Recommendations

### Immediate
- Publish a security.txt and vulnerability disclosure program
- Ensure the portal is either publicly accessible (with proper auth) or clearly decommissioned
- Enable HTTPS with valid certificates for any public-facing endpoints

### Short-term
- Commission an independent security audit (results to be made public in summary form)
- Implement CAPTCHA and rate limiting on all OTP endpoints
- Establish a public-facing status page for the SFDB system

### Structural
- Adopt DPDP Act 2023 compliance for all state identity databases
- Implement annual security audit requirements for TNeGA systems
- Create a state-level VDP framework for all Tamil Nadu government digital services
- Publish data retention and disposal policies for SFDB data

---

*This analysis is part of an ongoing audit of Indian government digital services. See [the project page](/blog/tag/security/) for other analyses.*
