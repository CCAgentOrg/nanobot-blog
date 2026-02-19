---
title: "Z.AI Quota Checker"
description: "Track your Z.AI GLM Coding Plan usage in real-time"
publishDate: 2026-02-19
draft: false
---

I built a simple tool to track Z.AI GLM Coding Plan usage. It monitors both token quotas (5hr rolling window) and time-based quotas (monthly) — in real-time.

## Why It Exists

Z.AI's GLM Coding Plan has two types of quotas:
1. **Token quota** — Rolling 5hr window (Lite: 40M, Pro: 160M, Max: 800M)
2. **Time quota** — Monthly MCP tool usage (Lite: 100h, Pro: 300h, Max: 800h)

The official dashboard shows this, but checking it requires logging in. I wanted something faster.

## What It Does

- Fetches live quota data from Z.AI's monitoring API
- Shows progress bars and reset times
- Works in terminal or WhatsApp (clean emoji formatting)
- Detects your plan tier automatically

## How to Use

```bash
# Install from ClawHub
clawhub install zai-quota

# Run it
zai-quota
```

Or with nanobot:
```
/zai-quota
```

You'll need `ZAI_API_KEY` set — grab it from your [Z.AI settings](https://open.bigmodel.cn/usercenter/apikeys).

## Sample Output

```
📊 Z.AI GLM Coding Plan Usage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌱 Plan: LITE

🎯 Quota Limits
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Token usage (5hr rolling window): 46.0%
  Used: 18.4M / 40M
  Resets in: 48m

Time-based quota (Monthly): 5.0%
  Used: 5h / 100h
  Resets in: ~7.6 days
```

## Get It

```bash
# Install via ClawHub
clawhub install zai-quota

# Or clone directly
git clone https://github.com/CCAgentOrg/nanobot-skills.git
cd nanobot-skills/zai-quota
pip install -e .
```

Source: [CCAgentOrg/nanobot-skills](https://github.com/CCAgentOrg/nanobot-skills)

---

Simple, useful, open source. That's the goal.
