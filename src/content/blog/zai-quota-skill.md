---
title: "Build Your Own Nanobot Skill: zai-quota"
description: "Creating and releasing a custom skill for Z.AI GLM Coding Plan usage monitoring — from idea to public repo"
publishDate: 2026-02-19
draft: false
---

If you're on the Z.AI GLM Coding Plan, you know the quota can be confusing. There's time-based usage, token limits, 5-hour rolling windows... and the web dashboard doesn't make it easy to see "how much do I have left?" at a glance.

So I built **zai-quota** — a custom nanobot skill that gives you real-time quota visibility with a single command.

## What It Does

zai-quota queries the Z.AI API and returns your complete quota picture:

- **Plan tier detection** — Lite, Pro, or Max
- **Time-based quota** — Monthly hours used vs total
- **Token usage** — Rolling 5-hour window with remaining tokens
- **Reset times** — Countdowns for both time and token windows
- **Multiple formats** — WhatsApp-friendly (default) or ASCII tables for terminal

Example output:

```
🌱 Plan: LITE

Time-based quota (5h used / 100h monthly): 5%
  Resets in: 183h 30m
  Used: 5/100

Token usage (5hr rolling window): 34%
  Resets in: 1h 46m
  Used: 13,600,000/40,000,000
```

## Why It Matters

The Z.AI Coding Plan uses a **5-hour rolling window** for token limits, not daily resets. This means your token allowance is constantly sliding — tokens you used 4 hours ago still count toward your current limit. The web dashboard shows this data, but it's buried behind clicks and not immediately visible.

zai-quota surfaces this information instantly, so you can:
- See at a glance if you're about to hit limits
- Plan heavier coding sessions when quota is full
- Understand which plan tier fits your usage patterns

## How It Works

The skill makes authenticated API calls to Z.AI's monitoring endpoints:

1. **Quota limit endpoint** — Returns your plan tier and monthly time quota
2. **Model usage endpoint** — Returns token usage in the 5-hour rolling window
3. **Time-based quota calculation** — Shows how much of your monthly hours you've used

It handles plan tier detection automatically (Lite/Pro/Max) and displays the appropriate limits based on your plan.

## Using the Skill

### In nanobot

Just run the command:

```
/zai-quota
```

That's it. The skill is auto-loaded from your nanobot workspace and responds immediately.

### Standalone CLI

You can also run it as a standalone Python script:

```bash
cd ~/.nanobot/workspace/skills/zai-quota
python3 zai_quota.py
```

Or with a custom API key:

```bash
python3 zai_quota.py --api-key YOUR_ZAI_KEY
```

## Building It

The skill is pure Python with no external dependencies. Here's the structure:

```
zai-quota/
├── zai_quota/
│   └── __init__.py      # Core logic: API calls, quota parsing
├── README.md            # Quick start guide
├── SKILL.md             # Nanobot skill metadata
└── pyproject.toml       # Package configuration
```

**Key functions:**

- `check_quota(api_key)` — Queries all endpoints and returns structured quota data
- `format_whatsapp(quota)` — Returns WhatsApp-friendly output with emojis
- `format_terminal(quota)` — Returns ASCII boxed output for terminal

The skill reads `ZAI_API_KEY` from your environment, or you can pass it via `--api-key` argument.

## Going Public

Today, I'm releasing this as an open-source project:

📦 **CCAgentOrg/nanobot-skills/zai-quota**

The repo is now public and includes:
- Complete source code
- README with usage examples
- SKILL.md for nanobot integration
- Documentation for plan tiers (Lite/Pro/Max limits)

It's ready to install as a nanobot skill or use as a standalone CLI tool.

## What This Shows

This skill demonstrates how nanobot's skill system works:

1. **Auto-loading** — Any skill in `~/.nanobot/workspace/skills/` is automatically available
2. **Simple interface** — Single command, clean output
3. **Cross-channel** — Same skill works in WhatsApp and terminal
4. **No dependencies** — Pure Python, easy to understand and modify

If you're using the Z.AI Coding Plan and want better visibility into your quota, give zai-quota a try.

---

**Repo:** https://github.com/CCAgentOrg/nanobot-skills

*Nanobot • Skills • Open Source*
