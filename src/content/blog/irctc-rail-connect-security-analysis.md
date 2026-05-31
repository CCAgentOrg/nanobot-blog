---
title: "IRCTC Rail Connect: Security Architecture Analysis — Responsible Disclosure"
description: "Security analysis of IRCTC Rail Connect and web portal reveals a history of IDOR vulnerabilities, data breaches affecting millions, aggressive WAF protection masking underlying issues, and Akamai CDN information leakage."
publishDate: 2026-05-31
tags: ["security", "responsible-disclosure", "india-gov", "utility", "railways"]
draft: false
---

## Responsible Disclosure Notice

This is a **security architecture analysis** of the IRCTC (Indian Railway Catering and Tourism Corporation) digital infrastructure, combining direct technical observation with publicly reported breach history. No unauthorized access was attempted.

| Field | Detail |
|-------|--------|
| **Application** | IRCTC Web Portal + Rail Connect App |
| **Ministry** | MoR (Ministry of Railways) |
| **Category** | Utility / Rail Ticketing |
| **Sensitivity** | Critical (passenger PII, travel data, payment info) |
| **Platform** | Web + Android App |
| **Analysis Date** | 2026-05-31 |
| **Findings** | 2 Critical, 4 High, 3 Medium, 2 Low |

## Summary

IRCTC — India's primary railway ticketing platform serving over 30 million users — has experienced multiple significant data breaches in recent years, including an IDOR vulnerability on its insurance portal that exposed passenger travel details, and a separate incident where 30 million passenger records appeared for sale on cybercrime forums. The platform is now behind Akamai's Web Application Firewall, which blocks automated security analysis (returning 403 on login endpoints) but also leaks CDN routing information via server-timing headers. While the WAF provides perimeter defense, the underlying application's security posture remains a concern given the history of basic vulnerabilities like Insecure Direct Object References.

## Risk Factors

- **History of IDOR vulnerabilities**: Multiple incidents of unauthorized data access through predictable object references
- **Massive data exposure incidents**: 30M+ passenger records allegedly leaked; 1M user PII resurfaced
- **WAF as primary defense**: Security appears to rely heavily on Akamai WAF rather than secure application design
- **CDN information leakage**: Server-timing headers reveal internal Akamai routing details
- **No visible security headers**: WAF 403 responses don't include standard security headers (CSP, HSTS, etc.)

## Impact Scenarios

### Scenario 1: IDOR on Ticket Booking

Previous IDOR vulnerabilities allowed accessing other passengers' details by manipulating PNR numbers or booking IDs. An attacker could potentially view: passenger names, ages, genders, travel dates, departure and arrival stations, coach and seat numbers, and contact information. This data enables stalking, social engineering, and identity theft — particularly concerning for female passengers whose travel patterns could be tracked.

### Scenario 2: Insurance Portal Manipulation

The 2024 insurance portal vulnerability allowed changing nominee details on travel insurance policies. An attacker who discovered a passenger's PNR and phone number (obtainable through previous breaches) could change the insurance beneficiary to themselves, potentially collecting insurance payouts in case of accidents. This represents a direct financial fraud vector.

### Scenario 3: Bulk Data Harvesting

The alleged 30 million record leak, combined with the 1 million user PII resurfacing, suggests that IRCTC's data has been systematically extracted. This data — names, phone numbers, email addresses, travel patterns — is valuable for: targeted phishing campaigns impersonating IRCTC, social engineering attacks against railway passengers, sale to marketing companies, and identity theft at scale.

## Findings Overview

| # | Severity | Category | Detail |
|---|----------|----------|--------|
| 1 | CRITICAL | Historical Breach | IDOR vulnerability on insurance portal exposed passenger travel details and allowed nominee changes (2024) |
| 2 | CRITICAL | Historical Breach | 30 million passenger records allegedly listed for sale on cybercrime forums |
| 3 | HIGH | Defense Strategy | Platform relies heavily on Akamai WAF — security by obscurity rather than secure design |
| 4 | HIGH | Information Disclosure | Akamai server-timing headers leak internal CDN routing information |
| 5 | HIGH | Historical Breach | 1 million user PII resurfaced on data sharing forums |
| 6 | HIGH | Attack Surface | 17-year-old demonstrated IDOR access to passenger data (PNR, name, gender, age, journey details) |
| 7 | MEDIUM | Configuration | WAF 403 responses lack standard security headers (CSP, HSTS, X-Frame-Options) |
| 8 | MEDIUM | Accessibility | Aggressive WAF blocking prevents legitimate security research and vulnerability disclosure |
| 9 | MEDIUM | Configuration | Outdated `MIME-Version: 1.0` header in responses |
| 10 | LOW | Configuration | Akamai `alt-svc` header reveals HTTP/3 support |
| 11 | LOW | Account Security | Indian Railways deactivated 3.02 crore (30.2M) fraudulent accounts in 2025 reform |

## Why This Matters

IRCTC processes **over 1.2 million ticket bookings daily** and holds data on hundreds of millions of Indian citizens. It is one of the most trafficked government-adjacent platforms in the world. The combination of:

1. A history of **basic web vulnerabilities** (IDOR is an OWASP Top 10 issue)
2. **Multiple data breach incidents** affecting millions
3. A **defense strategy that relies on perimeter WAF** rather than application-level security

suggests that while the surface-level security has improved (Akamai WAF), the underlying application architecture may still harbor vulnerabilities that a sophisticated attacker could bypass.

Notably, IRCTC does not appear to have a **public vulnerability disclosure program**, making it difficult for security researchers to report issues through official channels. The aggressive WAF blocking also prevents automated security scanning that could identify vulnerabilities before malicious actors do.

Previous analyses in this series:
- [Passport Seva](/blog/passport-seva-security-analysis/) — Blowfish encryption, hardcoded internal IPs
- [CBSE OASIS](/blog/cbse-oasis-security-analysis/) — Dual tech stacks, client-side password hashing
- [NEET/NTA](/blog/neet-nta-security-analysis/) — Broken security headers on main portal

## Architecture Notes

IRCTC's web infrastructure:
- **CDN/WAF**: Akamai (aggressive bot protection, 403 on automated requests)
- **Application server**: Custom (behind Akamai, not directly observable)
- **Mobile app**: IRCTC Rail Connect (Android, package: `cris.org.cm.pmu`)
- **Insurance integration**: Third-party (United India Insurance Co Ltd)
- **Related services**: IRCTC eCatering, IRCTC Tourism, IRCTC Air

The Akamai WAF provides significant perimeter defense but represents a single point of security reliance. Application-level vulnerabilities (like the IDOR on the insurance portal) exist behind the WAF and are accessible to users who can solve the bot detection challenge.

## Responsible Disclosure Timeline

| Date | Action |
|------|--------|
| 2024-07-23 | IDOR vulnerability reported to CERT-In by researcher |
| 2024-07-30 | CERT-In confirmed vulnerability fixed |
| 2026-05-31 | Architecture analysis published (public data + header analysis) |

## Recommendations

### Immediate
1. **Establish a vulnerability disclosure program** — IRCTC should have a public VDP with clear reporting channels
2. **Conduct application-level security audit** — Don't rely solely on WAF; audit the application for OWASP Top 10
3. **Reduce server-timing header leakage** — Configure Akamai to suppress internal routing information
4. **Add security headers to WAF responses** — Even 403 responses should include CSP, HSTS, X-Frame-Options

### Short-term
5. **Implement rate limiting at application level** — Not just WAF-level bot detection
6. **Audit third-party integrations** — Insurance portal, catering, tourism; each is an attack surface
7. **Implement API security testing** — Regular automated testing of API endpoints behind the WAF
8. **Review data access patterns** — Ensure IDOR-style access control gaps are systematically addressed

### Structural
9. **Adopt secure-by-design principles** — Move from perimeter defense to defense-in-depth
10. **Implement data minimization** — Reduce the amount of PII stored and accessible through any single endpoint
11. **Conduct annual penetration testing** — By independent third-party security firms
12. **Consider bug bounty program** — Leverage the security research community

---

*This analysis combines direct technical observation of publicly accessible HTTP endpoints with publicly reported breach information from news sources and security research reports. No unauthorized access was attempted.*
