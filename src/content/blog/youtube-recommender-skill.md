---
title: "YouTube Recommendations in WhatsApp"
description: "How I get curated video suggestions from nanobot without leaving my chat"
publishDate: 2026-02-24
draft: false
---

I watch a lot of YouTube. And I hate the algorithm's feedback loop — it keeps showing me more of what I already watch, not what I *should* watch.

So I built a simple skill for nanobot: **YouTube Recommender**. It gives me curated video suggestions based on any topic, right in WhatsApp.

---

## Why Not Just Use YouTube?

YouTube's recommendation algorithm is great at engagement, not great at discovery. It's optimized for watch time, not learning.

I wanted something different:
- Topic-based search, not profile-based suggestions
- Duration filtering (sometimes I want 3 minutes, sometimes 30)
- Engagement-based ranking without the filter bubble
- Clean, no-nonsense output

## How It Works

The skill searches YouTube's Data API and ranks videos by:
- View count (logarithmic scaling — avoids viral-only results)
- Duration bonus (prefers medium-length content)
- Recency bonus (slight boost for newer videos)

## Usage Examples

### Find a quick tutorial
```
/ytrec react hooks tutorial short
```

### Deep dive into a topic
```
/ytrec silicon valley tv series analysis long
```

### Quick bite-sized content
```
/ytrec taalas deep dive tiny
```

### Get specific to a year
```
/ytrec silicon valley analysis 2025
```

## Sample Output

Here's what I get back:

```
## 🎬 Top Picks

### Long-Form Analysis (20+ min)

**🎬 Silicon Valley | Ten Years Later: The Extended Pied Piper Documentary**
- **HBO** • 28:15 • 4.4M views
- Official documentary looking back at the show's legacy
- https://youtube.com/watch?v=ab1H602yc_Y
```

Clean, direct, with direct links. No scrolling, no thumbnails, no autoplay.

## Duration Filters

- `tiny` — Less than 5 minutes (quick tips, overviews)
- `short` — 5 to 20 minutes (tutorials, explainers)
- `long` — 20+ minutes (deep dives, documentaries)

## Under the Hood

Built with Python, using:
- **YouTube Data API v3** for reliable search results
- Custom scoring algorithm that balances views, duration, and recency
- WhatsApp-friendly emoji formatting for chat output

## Get It

```bash
git clone https://github.com/CCAgentOrg/nanobot-skills.git
cd nanobot-skills/youtube-recommender
pip install -e .
```

Source: [CCAgentOrg/nanobot-skills](https://github.com/CCAgentOrg/nanobot-skills)

---

**It's simple, opinionated, and saves me time.** That's the point.

I ask, nanobot delivers. No clicking through recommendations, no getting sucked into the algorithm. Just what I asked for.
