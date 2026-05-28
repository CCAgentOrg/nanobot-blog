---
title: "U-WIN Immunization Portal: Security Architecture Analysis & Responsible Disclosure"
description: "A deep-dive into the U-WIN (Universal Immunization) portal's client-side architecture reveals hardcoded secrets, weak data protection, and OTP routing flaws that expose sensitive health data of India's mothers and children."
publishDate: 2026-05-28
draft: false
---

India's Universal Immunization Programme (UIP) — one of the largest public health programmes in the world — has gone digital. The **U-WIN portal** (Universal Immunization - Win) and its companion mobile application for field workers (ANMs, ASHAs, vaccinators) manage vaccination records for millions of pregnant women, new mothers, and children across India.

I recently received an **unsolicited SMS OTP from the U-WIN portal**, followed by **someone else's vaccination certificate** delivered to my phone. I never signed up. I never shared an OTP with anyone. I'm fairly confident my device is secure.

This prompted a security analysis of the U-WIN application architecture. The findings are concerning.

---

## What is U-WIN?

U-WIN is the Ministry of Health and Family Welfare's digital platform for India's immunization programme. It succeeds Co-WIN (the COVID-19 vaccination platform) and inherits much of its technical architecture.

The ecosystem consists of:

- **Self-Registration Portal** (`uwinselfregistration.mohfw.gov.in`) — for citizens to register themselves and their family members
- **Vaccinator App** — an Android application for ANMs, ASHAs, and other healthcare workers to manage vaccinations in the field
- **Admin Portal** — for state/district-level health officials to oversee the programme
- **Report Portal** — for monitoring and surveillance data

All components share common backend API infrastructure.

---

## Scope of Analysis

This analysis was conducted on the **publicly downloadable Android application** (APK) available from official government distribution channels. The analysis focused exclusively on:

1. **Client-side code** shipped within the APK (JavaScript/TypeScript web bundle)
2. **API endpoint enumeration** from the app's routing and service configurations
3. **Authentication and data protection mechanisms** visible in the client layer

No active exploitation was performed against production systems. No attempts were made to access, modify, or exfiltrate any citizen data. The findings are derived entirely from static analysis of publicly distributed code.

---

## Findings

### Finding 1: Hardcoded Cryptographic Material in Client-Side Code

**Severity: Critical**

The application ships with cryptographic secret values **embedded directly in the client-side JavaScript bundle**. These values are:

- **Identical across every installation** — every user's APK contains the same secrets
- **Trivially extractable** — any person can decompile the APK and retrieve them in under 5 minutes using freely available tools (jadx, apktool)
- **Used for "protecting" sensitive data in transit** — including OTPs, passwords, and personally identifiable information

**Why this matters:** When cryptographic secrets are embedded in client-side code, they are not secrets at all. They are effectively public information that anyone can extract. This is roughly equivalent to locking your front door but leaving the key under the doormat — and printing the doormat's design in the local newspaper.

**Impact on citizens:** These hardcoded values are used to obfuscate authentication credentials (OTPs, passwords) before transmission. Since every user shares the same "encryption" key, anyone who extracts it can:

- Understand the data transformation applied to sensitive fields
- Potentially forge or manipulate authentication tokens
- Replay or intercept obfuscated (but not meaningfully protected) credentials

---

### Finding 2: Weak Client-Side Data Protection

**Severity: Critical**

The application employs a client-side data transformation mechanism (referred to in the codebase as an "encryption/decryption service") to protect sensitive user data before it is sent to the server.

Analysis of this mechanism reveals it uses a **simple, reversible character-level transformation** — not a standard encryption algorithm (AES, RSA, or any recognized cipher). This transformation:

- Provides **no meaningful cryptographic protection** against any adversary
- Is **symmetric and deterministic** — the same input always produces the same output
- Can be **fully reversed** once the transformation logic is understood

**Why this matters:** This is security theatre, not security. It creates a false impression of data protection while providing none. Data "encrypted" this way is effectively transmitted in plaintext from a cryptographic standpoint.

**Impact on citizens:** When a citizen's phone number, OTP, or password is "encrypted" by this mechanism and sent to the server, it is readable by anyone who has extracted the client-side code. This applies to:

- All vaccination beneficiary data submitted by healthcare workers
- All authentication credentials during login
- All profile information during registration

---

### Finding 3: OTP Routing to Healthcare Worker Phones Instead of Citizen Phones

**Severity: High**

This is the finding that directly explains my own experience of receiving an unsolicited OTP and someone else's vaccination certificate.

The U-WIN system allows **healthcare workers (ANMs, ASHAs, vaccinators)** to register beneficiaries (pregnant women, children) using the healthcare worker's own mobile number, rather than the beneficiary's mobile number.

This design decision means:

1. A healthcare worker enters their phone number while registering a pregnant woman or child
2. The OTP for verification is sent to the **healthcare worker's phone**
3. The vaccination certificate is also linked to the **healthcare worker's phone number**
4. Any citizen who later gets assigned that phone number (through SIM recycling) can access all previously registered beneficiary records

**Why this matters:** India's telecom operators routinely recycle mobile numbers after ~90 days of non-use. When a number is reassigned, the new owner gains access to every beneficiary record linked to that number — with no additional identity verification.

This is an **inherited design flaw from Co-WIN**, where the same architecture allowed the now-infamous Co-WIN data breach that exposed millions of citizens' vaccination records.

**Impact on citizens (real-world scenarios):**

- **Scenario A — SIM Recycling:** An ASHA worker in a rural area leaves her job and stops using her mobile number. After 90 days, the number is reassigned to a new subscriber. That new subscriber now receives OTPs allowing access to vaccination records of every pregnant woman and child that ASHA had registered.
- **Scenario B — Wrong Number Entry:** A healthcare worker accidentally types an incorrect phone number during beneficiary registration. The OTP and all future vaccination certificates go to an unsuspecting citizen — exactly what happened to me.
- **Scenario C — Malicious Insider:** A healthcare worker deliberately uses a phone number they control to register beneficiaries, creating a permanent backdoor to access those records even after they leave their position.

---

### Finding 4: No Multi-Factor Identity Verification Beyond OTP

**Severity: High**

Authentication to the U-WIN system relies **solely on a mobile number + OTP combination**. There is no secondary identity verification step using:

- Aadhaar authentication
- ABHA (Ayushman Bharat Health Account) verification
- Any form of biometric verification
- Any knowledge-based verification

**Why this matters:** A mobile number is a routing identifier, not a proof of identity. The government's own response to the Co-WIN data breach (June 2023) stated:

> *"The person who has been vaccinated can have an access to the Co-WIN data through use of registered mobile number with OTP authentication."*

This statement describes the vulnerability as if it were a feature. If you know (or can guess) someone's phone number and can receive an OTP (through SIM recycling, social engineering, SS7 vulnerabilities, or number porting fraud), you have full access to their immunization records.

**Impact on citizens:** Immunization records contain some of the most sensitive health data possible:

- Pregnancy status and delivery records
- Child's date of birth, vaccination schedule, and health milestones
- Mother's name, address, and contact information
- Healthcare facility visit history
- ABHA ID and Aadhaar-linked identity markers

Exposure of this data can lead to:

- **Targeted scams** — fraudsters calling pregnant women or new mothers with fake government scheme offers
- **Identity theft** — combining immunization records with other breached data for synthetic identity fraud
- **Stalking and harassment** — knowing when and where a woman accesses maternal healthcare services
- **Discrimination** — employment or insurance discrimination based on health status

---

### Finding 5: Co-WIN Infrastructure Reuse Without Security Upgrades

**Severity: Medium**

The U-WIN application reuses significant portions of the Co-WIN technical infrastructure, including:

- API base URLs hosted on the same domain infrastructure as Co-WIN
- Identical application architecture patterns (Angular + Capacitor WebView wrapper)
- The same reCAPTCHA site key from the Co-WIN era
- The same authentication flow design

This means vulnerabilities identified in Co-WIN over 2022-2024 have been **carried forward unchanged** into U-WIN, a system that handles even more sensitive data (maternal and child health records, not just COVID vaccination status).

---

## Impact Assessment

### Scale of Potential Exposure

U-WIN covers India's **Universal Immunization Programme**, which serves approximately **26 million pregnant women** and **27 million infants** annually. The system maintains lifelong vaccination records for every registered beneficiary. The potential exposure encompasses:

- **Cumulative records:** Hundreds of millions of beneficiary records accumulated since the system's launch
- **Data sensitivity:** Among the highest categories of sensitive personal data — combining health information, identity markers, and government service utilization patterns
- **Affected population:** Predominantly women and children from rural and semi-urban India — the exact demographic least equipped to detect, report, or mitigate data breaches

### Attack Surface Summary

| Finding | Attack Vector | Data at Risk | Effort Required |
|---------|--------------|-------------|----------------|
| Hardcoded secrets | Static analysis of APK | All API communications | Trivial (5 minutes) |
| Weak client-side encryption | Any network observer | OTPs, passwords, PII | Trivial |
| OTP routing flaw | SIM recycling, wrong number entry | Beneficiary vaccination records | None (happens by design) |
| No multi-factor auth | Any OTP delivery mechanism | Complete beneficiary profiles | Low |

---

## Responsible Disclosure

This disclosure follows a responsible disclosure policy. Specific exploit details, exact API endpoints, cryptographic keys, and step-by-step reproduction instructions have been intentionally **omitted** from this post to prevent misuse while the vulnerabilities are being addressed.

### Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-05-28 | Vulnerabilities identified through static analysis of publicly distributed APK |
| 2026-05-28 | Blog post published documenting findings at a severity-level appropriate for public awareness |
| TBD | Reports to be filed with relevant authorities (NCIIPC, CERT-In) |
| TBD | Direct communication to MoHFW / U-WIN development team |

### To Whom It May Concern

If you are a representative of the Ministry of Health and Family Welfare, the National Health Mission, NCIIPC, or the U-WIN development team, and would like to receive:

- A detailed technical report with specific vulnerable code locations
- Reproduction steps for each finding
- Recommendations for remediation

Please contact via the channels listed below.

---

## Recommendations

### Immediate (This Week)

1. **Rotate all hardcoded cryptographic secrets** currently embedded in the client-side bundle. Move to server-side secret management with per-session or per-request keys derived through a proper key exchange mechanism.
2. **Replace the client-side obfuscation** with standard TLS encryption (which is already in use for transport) and, where additional field-level protection is needed, implement proper AES-256 encryption with server-managed keys.
3. **Add an advisory banner** on the self-registration portal informing healthcare workers that beneficiary phone numbers should be the beneficiary's own number, not the worker's.

### Short-Term (This Month)

4. **Implement mandatory secondary identity verification** using ABHA ID or Aadhaar e-KYC for accessing beneficiary records. Mobile OTP alone is insufficient for health data of this sensitivity.
5. **Add a beneficiary phone number verification** step that sends a confirmation SMS to the beneficiary's own number, creating an audit trail and allowing beneficiaries to know their data has been registered under a specific mobile number.
6. **Implement session binding** so that beneficiary records are tied to verified identity, not just a phone number that may change ownership.

### Structural (This Quarter)

7. **Conduct a full security audit** of the U-WIN platform by an independent, qualified security firm with specific expertise in healthcare data protection.
8. **Establish a formal vulnerability disclosure programme** with clear channels for security researchers to report findings, similar to the policies maintained by US government agencies (.gov VDP) and private-sector health systems.
9. **Evaluate the system against the Digital Personal Data Protection (DPDP) Act, 2023** requirements, particularly the provisions around data fiduciary obligations for processing children's health data.

---

## Context: Why This Matters Now

The recent **CBSE OSM portal incident** (May 2026) is instructive. A 19-year-old security researcher found critical vulnerabilities in CBSE's digital evaluation system, reported them through proper channels in **February 2026**, and by May, most remained unfixed. CBSE's response was to deny the vulnerability existed and claim the affected portal was "only a testing platform" — despite video evidence showing production data.

The structural problems with India's government vulnerability disclosure ecosystem are well-documented:

- **No transparency** — CERT-In has been granted RTI immunity, making it impossible to audit its responsiveness
- **Legal risk to researchers** — Sections 43 and 66 of the IT Act, 2000 can criminalize good-faith security research
- **No formal VDP for most government systems** — unlike the US (.gov VDP), UK (NCSC), or Australia (ASD), most Indian government digital systems lack a formal channel for vulnerability reporting
- **No bug bounty programmes** — financial incentives that have proven effective in the private sector are absent

The Centre for Internet and Society's 2019 policy brief on this topic identified these exact gaps and recommended reforms — seven years ago, with minimal progress.

**When I publish this analysis today, I do so with the awareness that the traditional CERT-In route has a poor track record for government systems.** The hope is that public documentation creates accountability that internal reporting alone cannot.

---

## Contact

For responsible disclosure coordination:

- **Email:** srikanth@cashlessconsumer.in
- **PGP Key:** Available at [GitHub](https://github.com/CashlessConsumer)

This disclosure is made in good faith, in the public interest, and in accordance with reasonable security research practices. No exploitation was performed against any production system. All findings were derived from static analysis of publicly distributed software.

---

## References

1. U-WIN Self-Registration SOP v2, April 2024 — Ministry of Health & Family Welfare
2. CIS India — *Improving the Processes for Disclosing Security Vulnerabilities to Government Entities in India* (2019)
3. CERT-In Responsible Vulnerability Disclosure Policy — [cert-in.org.in/RVDCP.jsp](https://www.cert-in.org.in/RVDCP.jsp)
4. NCIIPC — Critical Information Infrastructure Protection Guidelines
5. Digital Personal Data Protection Act, 2023

---

*Published: May 28, 2026 | Author: Srikanth @ CashlessConsumer*
