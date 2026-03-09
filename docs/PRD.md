# PRD – CREO Lead Prioritization Tool

## Problem
CREO Solutions gets 200–400 inbound leads/month with no ranking system. Sales reps follow up in arbitrary order, wasting time on low-value leads. This tool ranks all leads by expected conversion value so the team knows who to call first.

## Users
| Role | Primary Need |
|---|---|
| Sales Rep | Ranked call list + per-lead score explanation |
| Marketing Manager | Lead quality charts by channel + neighbourhood |
| Business Owner | Pipeline health overview |

---

## Feature 1: Dashboard
**Priority**: Must Have

- [ ] 4 KPI cards: Total Leads, High-Priority Count, Avg Priority Score, Leads This Month
- [ ] Profit band donut chart (Low / Medium / High / Unlabeled counts)
- [ ] Avg priority score by referral source (horizontal bar chart)
- [ ] Avg job size by neighbourhood (bar chart)
- [ ] Top 5 leads mini-table with "Add to Queue" button on each row
- [ ] All charts load within 2 seconds

---

## Feature 2: Lead Priority Table
**Priority**: Must Have

- [ ] Columns: Rank, Property Type, Neighbourhood, Profit Band, Priority Score, Timeline, Source
- [ ] Priority score badge: green ≥ 0.6 | yellow ≥ 0.35 | red < 0.35
- [ ] Sortable by any column (default: priority score descending)
- [ ] Filters: Profit Band, Neighbourhood, Referral Source, Homeowner Status
- [ ] Click row → slide-out drawer with full lead details + top-3 factors in plain English
  - Example: "Large job size (+), Homeowner owns property (+), Flexible timeline (–)"
- [ ] "Add to Queue" button on each row and inside the drawer
- [ ] Pagination: 50 leads per page

---

## Feature 3: AI Text Analyzer
**Priority**: Should Have

- [ ] Large textarea for pasting text (min 200 chars visible)
- [ ] .txt file upload support
- [ ] "Analyze" button → Gemini API → result within 5 seconds
- [ ] Result card shows:
  - Extracted lead fields (label each as "Found" or "Defaulted")
  - Priority score + color badge
  - Predicted profit band
  - Plain-English explanation (1–2 sentences)
- [ ] "Add to Queue" button on result card
- [ ] If a field can't be extracted → show "Not mentioned", apply median/mode default
- [ ] Friendly error state if text too short or API fails

---

## Feature 4: Priority Queue
**Priority**: Must Have

- [ ] Leads addable from: Lead Table, AI Analyzer result, Dashboard top-5
- [ ] Each item shows: Lead ID, Priority Score, Date Added, Status, Notes
- [ ] Status cycle (click to advance): To Contact → In Progress → Done
- [ ] Items can be removed from the queue
- [ ] Queue sorted by priority score by default
- [ ] Persisted in localStorage (survives page refresh)
- [ ] Empty state: "Add leads from the Lead Table or Analyzer"
- [ ] Sidebar nav badge showing count of "To Contact" leads

---

## Success Criteria
| Metric | Target |
|---|---|
| Lead table load time | < 2 seconds |
| Analyzer response time | < 5 seconds |
| Model macro F1 (3-class) | > 0.55 |
| Top feature in model | job size or homeowner status in top 3 |
