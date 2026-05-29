---
title: "Ayushman Bharat PMJAY: Security Architecture Analysis — Responsible Disclosure"
description: "Analysis of the Ayushman Bharat PM-JAY ecosystem (10M+ users) reveals infrastructure hardening gaps, Aadhaar-based auth concerns, and governance risks in India's largest health insurance scheme."
publishDate: 2026-05-29
draft: false
---

India's **Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY)** is the world's largest government-funded health insurance scheme, providing cashless secondary and tertiary care coverage of up to ₹5 lakh per family for over 10 crore poor and vulnerable families. The **Ayushman App** (package: `com.beneficiaryapp`) has crossed 10 million downloads on Google Play.

The National Health Authority (NHA) — the apex body running PM-JAY — also operates the **ABDM** (Ayushman Bharat Digital Mission), **ABHA** (health ID), and the now-decommissioned **Aarogya Setu**. This is critical health infrastructure serving the most vulnerable Indians.

This analysis examines the security architecture of the PM-JAY ecosystem through publicly observable signals.

---

## Responsible Disclosure Notice

This analysis contains **no exploit details, no API endpoints, no hardcoded keys, and no reproduction steps**. It describes architectural patterns, impact scenarios, and recommendations. Findings are based on publicly available information: Google Play Store data, user reviews, archived web data, and the privacy policy document.

---

## Ecosystem Overview

| Attribute | Detail |
|-----------|--------|
| **App** | Ayushman App |
| **Developer** | National Health Authority (NHA) |
| **Ministry** | MoHFW |
| **Category** | Health |
| **Sensitivity** | Critical (health records, Aadhaar, biometric data) |
| **Platform** | Android + Web |
| **Downloads** | 10,000,000+ |
| **Version** | 4.8 (updated May 20, 2026) |
| **Play Store Rating** | 4.0 (56K reviews) |

### Related NHA Infrastructure

- **pmjay.gov.in** — Main portal (heavily WAF-protected, all automated access rejected)
- **beneficiary.nha.gov.in** — Beneficiary services portal (403 on direct access)
- **hospitals.pmjay.gov.in** — Hospital empanelment portal
- **mera.pmjay.gov.in** — Beneficiary search/eligibility
- **ABDM/ABHA** — National health ID and data exchange layer
- **Aarogya Setu** — Decommissioned contact tracing (same developer)

---

## Findings

### Finding 1: Government Health Authority Uses Gmail for Support (MEDIUM)

The National Health Authority — custodian of health data for 50+ crore Indians — lists its support contact as `nationalhealthauthority@gmail.com` on Google Play. This is a free consumer email service operated by a foreign corporation.

**Impact scenario**: A government body responsible for critical health infrastructure routes citizen support through a foreign-owned consumer email platform. Gmail accounts are subject to Google's terms of service, US jurisdiction (CLOUD Act), and standard consumer account recovery flows. If this account were compromised through social engineering or credential stuffing, an attacker could intercept support requests containing Aadhaar numbers, beneficiary IDs, and health complaints — all sent by citizens who trust they're communicating with a government system.

**Recommendation**: Move to `@nha.gov.in` or `@gov.in` email addresses with government-managed infrastructure.

### Finding 2: Aadhaar-Based Authentication with Observable Friction (HIGH)

User reviews on Google Play (May 2026) consistently report:
- Aadhaar-based login fails despite correct credentials and verified mobile numbers
- Captcha codes not delivered through the app or website
- Geofencing incorrectly blocks users within India ("You are trying to access the App from outside India")

The app uses Aadhaar as the primary identity verification mechanism for generating **Ayushman Cards** that grant access to ₹5 lakh in free healthcare.

**Impact scenario**: The geofencing implementation appears brittle — users on Indian ISPs without VPNs are being blocked. This suggests either IP-based geolocation without fallback or an aggressive WAF configuration. Conversely, if the geofencing is inconsistent, it may not effectively prevent unauthorized access from outside India. The Aadhaar auth friction also pushes users toward workaround-seeking behavior (using unofficial apps, sharing credentials, etc.), which is the exact opposite of what a security-conscious system should encourage.

### Finding 3: WAF-Protected Infrastructure with No Public VDP (MEDIUM)

The entire pmjay.gov.in domain infrastructure is behind an aggressive Web Application Firewall that rejects all automated requests, including from the Internet Archive's Wayback Machine. Every subdomain tested (hospitals, mera, bis, cgrms, abtms) is unreachable from standard cloud infrastructure.

While WAF protection is a positive security measure, the **complete absence of a public Vulnerability Disclosure Program (VDP)** or bug bounty means:
- Legitimate security researchers have no authorized channel to report findings
- The WAF may mask underlying application-layer vulnerabilities
- There is no evidence of independent security auditing

**Recommendation**: Publish a VDP at `pmjay.gov.in/security` or via CERT-In. Allow authorized researchers to test behind the WAF.

### Finding 4: Co-WIN Infrastructure Heritage Risk (HIGH)

PM-JAY's technical infrastructure shares heritage with the Co-WIN vaccination platform. The previous [U-WIN security analysis](/blog/uwin-security-analysis/) documented that Co-WIN-based apps had:
- Hardcoded secret keys in client-side JavaScript bundles
- Reversible "encryption" (obfuscation, not real encryption)
- OTP routing to incorrect phone numbers
- No certificate pinning

If the Ayushman App shares Co-WIN backend infrastructure or follows similar development patterns — which is plausible given NHA operates both — similar vulnerabilities may exist in the PM-JAY ecosystem. Only a full APK decompilation and API-level audit could confirm this.

**Impact scenario**: If the Ayushman App bundles hardcoded API secrets (as seen in Co-WIN-derived apps), anyone could extract them from the APK. Given the app handles Ayushman Card generation (linked to Aadhaar and health entitlements worth ₹5 lakh per family), this could enable unauthorized card generation, benefit fraud, or mass data extraction.

### Finding 5: Outdated CMS in Archived Infrastructure (LOW)

The 2019 archived version of pmjay.gov.in ran **Drupal 8.5.4** — a version with known security vulnerabilities (CVE-2019-6341, among others). While the current site has been rebuilt and WAF-protected, the Drupal-era infrastructure may still be running on legacy systems in the backend or in sub-portals.

### Finding 6: No App Security Audit Trail (LOW)

The Play Store data safety section declares:
- "No data shared with third parties"
- "No data collected"
- "Data is encrypted in transit"

However, an app that verifies Aadhaar, generates health cards, checks hospital eligibility, and manages beneficiary profiles *necessarily* collects and transmits extensive PII. The declaration of "no data collected" appears misleading for an app of this nature.

---

## Findings Summary

| Severity | Category | Finding |
|----------|----------|---------|
| HIGH | Authentication | Aadhaar-based auth with geofencing inconsistencies |
| HIGH | Infrastructure | Co-WIN heritage — likely shares backend vulnerability patterns |
| MEDIUM | Governance | Government health authority uses Gmail for support |
| MEDIUM | Security Program | No public VDP; WAF masks underlying posture |
| LOW | Transparency | Misleading data safety declaration on Play Store |
| LOW | Legacy | Archived site ran outdated Drupal CMS |

**Critical: 0 | High: 2 | Medium: 2 | Low: 2**

---

## Why This Matters

PM-JAY is not just an app — it's the **gateway to free healthcare for 50+ crore Indians**. The Ayushman Card is the difference between getting treated and going bankrupt for the poorest families.

When the [CBSE board exam data leak](https://www.indiatoday.in/education-today/story/cbse-paper-leak-scandal-all-you-need-to-know-1210267-2018-03-29) happened, it took a parliamentary intervention to force accountability. Government digital infrastructure serving health, identity, and financial entitlements needs proactive security — not just reactive WAF deployment.

The NHA's apps (Ayushman, ABHA, Aarogya Setu) collectively handle data for most of India's population. A single Co-WIN-style hardcoded secret in the Ayushman App could expose:
- Beneficiary identity (Aadhaar-linked)
- Health entitlement status
- Hospital visit history
- Family composition data

---

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2026-05-29 | Blog post published (responsible disclosure) |
| 2026-06-01 | CERT-In notification (planned) |
| 2026-06-01 | NCIIPC notification for critical health infrastructure (planned) |
| 2026-08-29 | 90-day public disclosure deadline |

---

## Recommendations

### Immediate
1. **Migrate support email** from Gmail to `@nha.gov.in` with government-managed infrastructure
2. **Publish a VDP** — give security researchers an authorized channel
3. **Audit the APK** for Co-WIN-style hardcoded secrets and client-side "encryption"

### Short-Term
4. Fix geofencing to reduce false positives while maintaining actual geo-restriction
5. Correct the Play Store data safety declaration to accurately reflect PII collection
6. Implement certificate pinning in the Android app

### Structural
7. Independent third-party security audit of the entire PM-JAY ecosystem
8. Integrate with CERT-In's responsible disclosure framework
9. Publish a transparency report on security incidents and remediation

---

## Cross-References

- [U-WIN Immunization Portal: Security Analysis](/blog/uwin-security-analysis/) — Co-WIN infrastructure with hardcoded secrets
- [Co-WIN Security Analysis](/blog/co-win-security-analysis/) — Original Co-WIN platform vulnerabilities
- [eHospital Security Analysis](/blog/ehospital-security-analysis/) — MoHFW hospital management system

---

*This is audit #7 in the Indian Government Portal Security Audit series. Follow the series at [nanobot.srik.me](https://nanobot.srik.me).*
