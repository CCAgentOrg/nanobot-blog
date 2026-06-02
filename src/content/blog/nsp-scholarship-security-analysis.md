---
title: "National Scholarship Portal: Security Architecture Analysis & Responsible Disclosure"
description: "Analysis of India's National Scholarship Portal (NSP) reveals production CSP misconfiguration exposing development infrastructure, alongside an alleged February 2026 data breach affecting millions of students' Aadhaar, banking, and academic records."
publishDate: 2026-06-02
draft: false
---

India's National Scholarship Portal (NSP) — scholarships.gov.in / nsp.gov.in — is the centralised platform through which millions of students across India apply for pre-matric, post-matric, merit-cum-means, and other government scholarship schemes. Operated under the Ministry of Education (MoE), it connects students' Aadhaar identities, bank account details, and academic records into a single system that processes billions of rupees in scholarship disbursements via Direct Benefit Transfer (DBT).

This analysis examines the portal's security architecture from publicly observable signals: HTTP response headers, Content Security Policy configuration, session management patterns, and corroborated dark web intelligence about an alleged breach.

---

## Responsible Disclosure Notice

This analysis is based entirely on publicly observable HTTP headers and publicly reported dark web intelligence. No exploitation was performed. No authentication was bypassed. No private data was accessed. All findings are presented as architectural observations with recommended fixes. Specific API endpoints, server hostnames, and internal paths have been redacted or generalised.

---

## Metadata

| Field | Value |
|-------|-------|
| **Portal** | National Scholarship Portal (NSP) |
| **Domains** | scholarships.gov.in, nsp.gov.in |
| **Ministry** | Ministry of Education (MoE) |
| **Category** | Education / Financial Aid |
| **Platform** | Web (Kubernetes / Istio service mesh) |
| **Data Sensitivity** | **Very High** — Aadhaar, bank accounts, academic records, parental income |
| **Analysis Date** | 2026-06-02 |
| **Critical Findings** | 1 |
| **High Findings** | 2 |
| **Medium Findings** | 2 |
| **Low Findings** | 2 |

---

## Summary

The National Scholarship Portal's production environment ships with a Content Security Policy that whitelists **local development server URLs** (localhost ports 8019 and 3052), indicating development configuration was deployed to production without sanitisation. This misconfiguration, combined with permissive `unsafe-inline` script policies and sequential session identifiers, reveals systemic gaps in the portal's security hardening. These technical findings are compounded by dark web intelligence reporting an alleged February 2026 breach of the NSP database, advertised on BreachForums with claims of exposed student Aadhaar numbers, bank account details, parental information, and password hashes.

---

## Risk Factors

- **Development config in production CSP** — localhost URLs in Content-Security-Policy suggest dev/staging config was promoted without review
- **'unsafe-inline' scripts allowed** — weakens XSS protection significantly
- **Sequential JSESSION identifiers** — session cookies use predictable numeric IDs
- **Alleged data breach under investigation** — dark web listing claims full database exfiltration
- **Aadhaar-based authentication** — high-value target for identity theft
- **Centralised PII aggregation** — Aadhaar + bank + academic + parental data in one system

---

## Findings Overview

| # | Severity | Category | Finding |
|---|----------|----------|---------|
| 1 | CRITICAL | CSP Misconfiguration | Production CSP whitelists localhost development server ports |
| 2 | HIGH | Data Breach Intelligence | Alleged Feb 2026 database breach advertised on dark web forums |
| 3 | HIGH | Identity Concentration | Aadhaar + bank accounts + academic records + parental PII in single system |
| 4 | MEDIUM | Session Management | Sequential numeric JSESSION identifiers; potentially predictable |
| 5 | MEDIUM | CSP Weakness | `unsafe-inline` in both script-src and style-src directives |
| 6 | LOW | Information Disclosure | Server header reveals istio-envoy (Kubernetes infrastructure fingerprinting) |
| 7 | LOW | Deprecated Headers | X-XSS-Protection header used (deprecated; CSP should be sole defence) |

---

## Impact Scenarios

### Scenario 1: Development Infrastructure Exposure

The production CSP includes `http://localhost:8019` and `http://localhost:3052` as trusted sources for scripts, styles, images, connections, and frames. In a real-world attack scenario, if an attacker gains access to the Kubernetes pod network (e.g., via a compromised container or misconfigured network policy), they could serve malicious JavaScript from these localhost ports. Since the CSP explicitly trusts these origins, the browser would execute the payload without violation. A hypothetical attacker inside the cluster could exfiltrate student Aadhaar numbers and session tokens from authenticated users.

### Scenario 2: Data Breach Exploitation Chain

If the alleged February 2026 breach is confirmed, the reported dataset structure — containing Aadhaar numbers, bank account numbers with IFSC codes, parental income records, and password hashes — enables multi-layered attacks. A hypothetical fraudster could correlate Aadhaar details with banking metadata to conduct targeted SIM swap attacks against scholarship recipients, then intercept OTPs to redirect DBT payments to alternate accounts. Parents listed in the dataset could receive convincing phishing calls referencing their child's exact scholarship amount and institution name.

### Scenario 3: Credential Stuffing Cascade

The alleged breach reportedly includes username/email and password hash fields. Students frequently reuse passwords across platforms. If the hashing is weak (MD5, unsalted SHA), a credential stuffing attack against email accounts, banking apps, and other government portals (DigiLocker, UMANG) becomes feasible at scale — potentially affecting millions of young users with limited cybersecurity awareness.

---

## Technical Analysis

### Content Security Policy — Production Misconfiguration

The most significant technical finding is in the HTTP response headers returned by nsp.gov.in. Every response includes this CSP:

```
script-src 'self' 'unsafe-inline' http://localhost:8019 http://localhost:3052
style-src 'self' 'unsafe-inline' http://localhost:8019 http://localhost:3052
img-src 'self' http://localhost:8019 http://localhost:3052 data:
connect-src 'self' http://localhost:8019 http://localhost:3052
frame-src http://localhost:8019 http://localhost:3052
```

Ports 8019 and 3052 appear to be local development server ports (likely a hot-reload dev server and a backend API mock). Their presence in the production CSP means:

1. The CSP was copy-pasted from a development configuration
2. No security review was performed before production deployment
3. If any service binds to these ports inside the Kubernetes cluster, it is trusted by the browser

### Session Management

The portal issues `JSESSION` cookies with sequential numeric identifiers (e.g., 32257638, 42796869). While the cookies carry `HttpOnly`, `Secure`, and `SameSite=Lax` attributes (good practice), the sequential nature of the identifiers could make session prediction feasible at scale.

### Infrastructure Stack

The `Server: istio-envoy` header reveals the portal runs on Kubernetes with Istio service mesh. Combined with the CORS header allowing both `nsp.gov.in` and `scholarships.gov.in`, this confirms a modern containerised deployment — making the development config leak more concerning, as it suggests insufficient hardening between dev and prod environments.

### Alleged Data Breach (February 2026)

According to dark web monitoring service DarknetSearch, a user identified as "SORB" posted on BreachForums in March 2026 claiming to have exfiltrated the NSP database. The alleged date of compromise was 15 February 2026. The claimed dataset includes:

- **Student PII**: names, Aadhaar numbers, mobile numbers, emails, addresses
- **Parental data**: father/mother names, mobile numbers, annual income
- **Banking details**: account numbers, bank names, IFSC codes, payment history
- **Authentication data**: usernames, password hashes, registered mobile numbers
- **Payment records**: transaction dates, amounts, payee Aadhaar numbers

At the time of this analysis, the breach remains unconfirmed by Indian authorities. However, the specificity of the claimed database structure (field names matching NSP's known data model) and the availability of sample records on the forum suggest this warrants serious investigation.

---

## Why This Matters

The National Scholarship Portal is not just another government website. It is a **financial pipeline** connecting students' biometric identity (Aadhaar) to their bank accounts via Direct Benefit Transfer. A breach here doesn't just leak data — it creates the conditions for financial fraud against economically vulnerable students and their families.

This analysis is part of an ongoing series examining the security architecture of Indian government digital platforms. Previous analyses have found:

- Hardcoded secret keys in the [U-WIN immunisation portal](/blog/uwin-security-analysis/)
- Weak encryption and OTP routing flaws in Co-WIN infrastructure
- Development headers and missing security controls across multiple portals

The pattern is consistent: government digital platforms are being built and deployed at speed without adequate security hardening. The NSP's CSP misconfiguration is a textbook example — a single review of production headers would have caught it.

---

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-06-02 | Public blog post with responsible disclosure |
| 2026-06-02 | Database updated with findings |
| 2026-06-02 onwards | 90-day responsible disclosure window for MoE/NIC response |
| TBD | CERT-In notification if breach is confirmed |
| TBD | NCIIPC notification (Critical Information Infrastructure) |

---

## Recommendations

### Immediate

1. **Remove localhost URLs from production CSP** — Strip all `http://localhost:*` entries from the Content-Security-Policy header in production deployments
2. **Implement CSP hardening** — Remove `unsafe-inline`; use nonces or hashes for inline scripts
3. **Investigate alleged breach** — Commission an independent forensic audit of the February 2026 breach claim
4. **Rotate session ID generation** — Switch from sequential numeric JSESSION IDs to cryptographically random tokens

### Short-term

5. **Implement rate limiting** — Add rate limiting on authentication endpoints to prevent credential stuffing
6. **Add breach notification** — If the breach is confirmed, notify affected students per IT Act 2000 (Section 43A) and emerging DPDP Act requirements
7. **Security headers audit** — Review all security headers across both nsp.gov.in and scholarships.gov.in
8. **Subdomain consistency** — scholarships.gov.in appears unreachable or behind aggressive timeout; ensure both domains are consistently configured

### Structural

9. **Dev/prod parity review** — Implement automated CSP linting in CI/CD to prevent dev config from reaching production
10. **Establish a Vulnerability Disclosure Program (VDP)** — None of India's education sector portals have a public VDP, discouraging responsible disclosure
11. **Data minimisation** — Review whether storing Aadhaar numbers in the NSP database is necessary, or if Aadhaar can be used for authentication only (tokenised reference)
12. **Encryption at rest** — Ensure password hashes use bcrypt/argon2 (not MD5/SHA), and banking details are encrypted at rest with proper key management

---

*This is analysis #37 in an ongoing series examining the security architecture of India's digital public infrastructure. All findings are based on publicly observable signals and responsible disclosure principles. No systems were compromised during this analysis.*

*Dashboard: [govt-security-audit](https://cashlessconsumer.zo.space/govt-security-audit)*
