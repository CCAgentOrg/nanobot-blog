---
title: "eHospital Security Architecture Analysis — Portal Unreachable"
description: "Attempted security analysis of eHospital (MoHFW) could not be completed as the portal at ehospital.gov.in is unreachable. This post documents the access failure and inherent risks for health data portals that cannot be externally assessed."
publishDate: 2026-07-01
tags: ["security", "responsible-disclosure", "india-gov", "health"]
draft: false
---

# eHospital: Security Architecture Analysis — Access Failure

> **Responsible Disclosure Notice**: This analysis could not be completed. The eHospital portal (ehospital.gov.in, IP: 164.100.83.230) consistently resets connections from external networks, preventing any client-side security assessment. This post documents the access failure and the inherent risks this poses.

| Field | Detail |
|-------|--------|
| **Application** | eHospital |
| **Ministry/Body** | MoHFW |
| **Data Category** | Health & Medical Data |
| **Sensitivity** | 🔴 Critical |
| **Platform** | Web (ORS/eHospital portal) |
| **Analysis Date** | 2026-07-01 |
| **Analysis Status** | ❌ Could not complete — portal unreachable |
| **Critical Findings** | N/A |
| **High Findings** | N/A |
| **Medium Findings** | N/A |
| **Low Findings** | N/A |

## Access Failure

Multiple attempts to access **ehospital.gov.in** from external networks resulted in **TCP connection resets**. The portal resolves to IP `164.100.83.230` (NIC infrastructure) but drops connections before completing the TLS handshake. The related ORS portal (ors.gov.in) exhibits identical behavior.

**Tests performed:**
- Direct HTTPS connection — connection reset by peer
- HTTP redirect check — no response
- Browser-based navigation — `ERR_CONNECTION_CLOSED`
- IP-direct access — connection reset
- Various User-Agent headers — no change

## Why Inaccessibility Is a Security Concern

### Scenario: No External Auditability

A critical health data portal that cannot be reached from outside the NIC network creates a false sense of security. "Security through inaccessibility" is not security — it means:

- **No independent verification**: Researchers and auditors cannot assess whether patient data is adequately protected
- **No transparency**: Citizens cannot verify what data the portal collects, how it's transmitted, or what client-side code runs in their browser
- **No bug bounty pathway**: Without an accessible surface, responsible disclosure becomes impossible through normal channels

### Scenario: Medical Privacy Violation

eHospital handles OPD registration, appointment booking, and patient records across AIIMS and other central government hospitals. Health data — vaccination status, pregnancy records, TB treatment, psychiatric consultations — is among the most sensitive personal information. Under India's DPDP Act 2023, health data is classified as "sensitive personal data" requiring the highest protection standards. Without external auditability, compliance with these standards cannot be independently verified.

### Scenario: Interoperability Risks

eHospital is part of the Ayushman Bharat Digital Mission (ABDM) ecosystem, linking to ABHA health IDs, Health Information Exchange (HIE), and the Health Facility Registry. Weaknesses in any component of this ecosystem can cascade — a vulnerability in eHospital's session handling could potentially expose ABHA-linked records across the entire network.

## Recommendations

### Immediate
- Ensure the portal is accessible from non-NIC networks for legitimate security research
- Publish a Vulnerability Disclosure Program (VDP) with clear contact channels
- Provide a publicly accessible staging/test environment for security assessment

### Short-term
- Implement CSP headers, HSTS, and X-Frame-Options on the portal
- Enable automated security scanning (OWASP ZAP, Nuclei) in CI/CD
- Engage CERT-In empanelled auditors for independent assessment

### Structural
- Adopt a public VDP aligned with ISO 29147 and ISO 30111
- Implement continuous security testing
- Make security audit reports public (redacted) to build citizen trust
- Align with DPDP Act 2023 requirements for sensitive personal data

## Next Steps

This audit will be retried when the portal becomes accessible. The target has been reset to **pending** status in our audit database.

---

*This analysis is part of an ongoing audit of Indian government digital services. See [the project page](/blog/tag/security/) for other analyses.*
