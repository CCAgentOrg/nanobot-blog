---
title: "CoWIN Portal Security Architecture Analysis — Responsible Disclosure"
description: "CoWIN (cowin.gov.in), India's COVID vaccination platform, is no longer operational. The portal returns empty server responses, indicating formal decommissioning. This analysis documents the platform's post-operational security posture."
publishDate: 2026-06-13
tags: ["security", "responsible-disclosure", "india-gov", "health"]
draft: false
---

# CoWIN Portal: Security Architecture Analysis

> **Responsible Disclosure Notice**: This post describes architectural observations about a decommissioned platform. No exploit details, API endpoints, hardcoded secrets, or reproduction steps are included.

| Field | Detail |
|-------|--------|
| **Application** | CoWIN Portal |
| **Ministry/Body** | MoHFW |
| **Data Category** | Health & Medical Data |
| **Sensitivity** | 🔴 Critical |
| **Platform** | Web |
| **Analysis Date** | 2026-06-13 |
| **Critical Findings** | 0 |
| **High Findings** | 0 |
| **Medium Findings** | 0 |
| **Low Findings** | 0 |

## Summary

This analysis examined **CoWIN** (cowin.gov.in), operated by **MoHFW**, which handled **health & medical data** — classified as **critical** sensitivity under our data risk framework.

The portal at `cowin.gov.in` is **no longer operational**. The server returns empty responses with no HTML content, indicating that the platform has been decommissioned following the end of India's COVID-19 vaccination program. No client-side code was available for analysis.

## Post-Operational Observations

While the portal is offline, several concerns remain for the data it previously handled:

### Scenario: Data Retention and Disposal

The CoWIN platform held vaccination records for over a billion Indian citizens — including names, mobile numbers, Aadhaar references, vaccination dates, certificate IDs, and beneficiary details. The absence of a live portal does not mean the data has been deleted. Without a formal data disposal framework:

- **Backend databases** may still retain all citizen vaccination records
- **API endpoints** may still exist for backend-to-backend data sharing (ABHA/ABDM integration)
- **Third-party integrations** (state health portals, travel apps) may retain cached copies
- **No public disclosure** of data retention policies or deletion timelines has been made

### Scenario: Dormant Infrastructure Risk

A decommissioned but still DNS-resolved server (cowin.gov.in responds to connections but returns empty data) poses risks:

- If the server is not fully shut down, unpatched software could be exploited
- Any residual APIs not properly disabled could leak data
- The domain itself, if allowed to lapse, could be hijacked

### Scenario: Historical Data Requests

Even with the portal offline, citizen data previously accessible through CoWIN may still be queryable through:
- ABDM/ABHA health ID integration
- State-level health data systems that consumed CoWIN APIs
- DigiLocker, which issued vaccination certificates based on CoWIN data

## Why This Matters

CoWIN was one of India's largest Digital Public Infrastructure deployments — registering over a billion vaccination records. Its decommissioning raises a critical question that India's DPI framework has not yet answered: **what happens to citizen data when a DPI platform is retired?**

India's DPDP Act 2023 requires data fiduciaries to implement clear data retention and disposal policies. For CoWIN, no such policy has been publicly disclosed. The data — vaccination records linked to identity documents — remains classified as sensitive personal data regardless of whether the portal is live.

The [previous U-WIN security analysis](/blog/u-win-security-analysis/) showed that successor platforms to CoWIN still carry architectural weaknesses. Without formal data disposal for CoWIN, the chain of custody for a billion citizens' health records is unclear.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-13 | Blog post published (observations only, no exploit details) |
| Pending | RTI to MoHFW on CoWIN data retention and disposal policy |
| Pending | CERT-In notification regarding decommissioned infrastructure |
| Pending | ABDM/ABDM query on data flow from decommissioned CoWIN |

## Recommendations

### Immediate (0-7 days)
- Fully decommission the cowin.gov.in server (stop DNS resolution or return proper HTTP 410 Gone)
- Disable any residual API endpoints not required for ABDM integration
- Publish a data retention and disposal policy

### Short-term (1-4 weeks)
- Audit all backend databases for proper access controls
- Verify that any data sharing with ABHA/ABDM uses current security standards
- Remove the domain from public DNS if no longer needed

### Structural (1-3 months)
- Implement a formal DPI decommissioning protocol for all government platforms
- Require public data retention and disposal policies under DPDP Act 2023
- Establish a data disposal audit framework for retired platforms

---

*This analysis is part of an ongoing audit of Indian government digital services. See [the project page](/blog/tag/security/) for other analyses.*
