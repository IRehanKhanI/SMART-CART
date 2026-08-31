# DESIGN.md

# Retail Operations Command — Design System

## 1. Design Direction

The interface must look like a **professional retail operations and management system**, not an AI showcase.

### Design Concept

**Retail Operations Command**

Visual inspiration should come from:

- Modern POS systems
- Retail management software
- Industrial control panels
- Warehouse management interfaces
- Store floor-plan systems
- Professional business dashboards

The interface should communicate:

> **Clear. Reliable. Operational. Practical. Human.**

It should feel like software that a real store manager could use every day.

---

# 2. Design Principles

## 2.1 Clarity First

Every screen must answer:

> "What do I need to know or do here?"

Avoid unnecessary decoration.

---

## 2.2 Information Hierarchy

Important information must visually dominate less important information.

Priority:

```text
Critical information
        ↓
Current status
        ↓
Important metrics
        ↓
Supporting information
        ↓
Historical/detail information
```

---

## 2.3 Low Cognitive Load

The user should not need to understand AI or computer vision terminology to operate the interface.

Prefer:

```text
High Queue
Low Stock
Normal
Attention Required
Resolved
```

Instead of technical terminology.

---

## 2.4 Operational Over Decorative

The interface must prioritize:

- Readability
- Status
- Comparison
- Trends
- Actions
- Navigation

over:

- Visual effects
- Decorative illustrations
- Excessive animation
- Large empty hero sections

---

# 3. Visual Style

## Style Name

**Retail Operations Command**

## Overall Appearance

- Light mode only
- Clean
- Structured
- Professional
- Slightly industrial
- Data-focused
- Minimal decoration

The design should resemble a **digital operations workstation**.

---

# 4. What NOT to Use

The following styles are explicitly prohibited.

### No Glassmorphism

Do not use:

- Frosted glass
- Background blur
- Transparent cards
- Glass panels
- Excessive translucency

---

### No Neumorphism

Do not use:

- Soft extruded surfaces
- Inner shadows
- Puffy controls
- Raised soft UI

---

### No Cyberpunk UI

Do not use:

- Neon borders
- Glowing text
- Neon grids
- Sci-fi HUDs
- Holographic effects

---

### No "AI Startup" Visual Language

Avoid:

- Purple/blue gradient backgrounds
- Floating AI blobs
- Robot illustrations
- AI brain graphics
- "AI MAGIC" labels
- Excessive glowing effects
- Generative-art backgrounds

---

### No Excessive Rounded UI

Avoid:

```text
border-radius: 30px+
```

The interface should use restrained corner radii.

---

### No Dashboard Overload

Do not place dozens of widgets on the home screen.

Every component must have a purpose.

---

# 5. Color System

## Base Colors

```text
Background
#F5F6F4

Surface
#FFFFFF

Primary Text
#202522

Secondary Text
#69716B

Muted Text
#8A918C

Border
#D9DDD8

Subtle Surface
#EEF0ED
```

---

# 6. Semantic Colors

Colors should communicate meaning rather than decoration.

## Normal

```text
Green
```

Used for:

- Operational status
- Healthy conditions
- Successful actions
- Resolved states

---

## Attention

```text
Amber
```

Used for:

- Warnings
- Approaching thresholds
- Items requiring attention

---

## Critical

```text
Red
```

Used only when immediate attention is required.

---

## Information

```text
Blue
```

Used for:

- Informational states
- Neutral highlights
- Navigation context

---

## Neutral

```text
Gray
```

Used for:

- Disabled states
- Inactive items
- Secondary information

---

# 7. Color Usage Rule

Never color entire cards just because they contain a status.

Prefer:

```text
┌────────────────────────────┐
│ QUEUE STATUS               │
│                            │
│ 7 customers                │
│                            │
│ ● HIGH                     │
└────────────────────────────┘
```

Instead of:

```text
████████████████████████████
█ entire card is red        █
████████████████████████████
```

Status color should be **controlled and meaningful**.

---

# 8. Typography

## Primary Font

Use:

**Inter**

Fallback:

```text
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

---

## Typography Hierarchy

### Page Title

```text
28–32px
font-weight: 650–700
```

### Section Title

```text
18–20px
font-weight: 600
```

### Card Title

```text
13–14px
font-weight: 600
```

### Primary Metric

```text
28–36px
font-weight: 650–700
```

### Body

```text
14–15px
font-weight: 400–500
```

### Metadata

```text
12–13px
font-weight: 400–500
```

---

# 9. Typography Rules

Do:

- Use sentence case
- Use short labels
- Use readable numbers
- Use consistent hierarchy

Avoid:

- Excessive uppercase text
- Decorative fonts
- Extremely thin fonts
- Giant headings
- Too many font sizes

Uppercase may be used for small operational labels such as:

```text
CURRENT FOOTFALL
SYSTEM STATUS
ACTIVE ALERTS
```

but should not be used for paragraphs.

---

# 10. Layout System

Use a consistent application shell.

```text
┌──────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
├───────────────┬──────────────────────────────────────────────┤
│               │                                              │
│               │                                              │
│   SIDEBAR     │              MAIN CONTENT                    │
│               │                                              │
│               │                                              │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

---

# 11. Sidebar

The sidebar should remain visually simple.

Recommended width:

```text
220–250px
```

Structure:

```text
BRAND

COMMAND
Overview

OPERATIONS
Shoppers
Inventory
Queues

INSIGHTS
Analytics
Reports

SYSTEM
Devices
Settings
```

Use grouping labels rather than putting every page into one long list.

---

# 12. Sidebar Behavior

Active page:

- Slight background highlight
- Stronger text
- Small status/accent indicator

Inactive page:

- Neutral text
- No strong visual effects

Example:

```text
┌──────────────────────┐
│  Overview             │
│                      │
│  ▌ Shoppers           │
│                      │
│  Inventory            │
│  Queues               │
└──────────────────────┘
```

Do not use glowing active states.

---

# 13. Header

The header should provide context rather than decoration.

Recommended structure:

```text
┌──────────────────────────────────────────────────────────┐
│ Overview                         Store 01   ● Operational │
└──────────────────────────────────────────────────────────┘
```

Possible elements:

- Current page
- Store selector
- System status
- Notification access
- User/profile menu

Keep the header compact.

---

# 14. Grid System

Use a responsive 12-column grid internally.

Desktop:

```text
12 columns
```

Tablet:

```text
8 columns
```

Mobile:

```text
4 columns
```

Cards should align to the grid.

Avoid random positioning.

---

# 15. Spacing System

Use a consistent spacing scale.

```text
4px
8px
12px
16px
20px
24px
32px
40px
48px
```

Primary spacing:

```text
Card padding:       20–24px
Section spacing:    24–32px
Grid gap:           16–20px
Page padding:       24–32px
```

---

# 16. Cards

Cards should be functional containers.

Default:

```text
Background: #FFFFFF
Border: 1px solid #D9DDD8
Border-radius: 8px
Padding: 20–24px
```

Use extremely subtle shadows only when needed.

Preferred:

```text
border > shadow
```

The interface should primarily rely on borders and spacing to create structure.

---

# 17. Metric Cards

Metric cards should be compact.

Example:

```text
┌──────────────────────────┐
│ CURRENT FOOTFALL         │
│                          │
│ 248                      │
│                          │
│ ↑ 12% from yesterday     │
└──────────────────────────┘
```

Structure:

```text
Label
↓
Large value
↓
Comparison / context
```

Do not fill the entire card with graphics.

---

# 18. Tables

Tables should be used when users need to compare multiple records.

Example:

```text
┌────────────┬──────────┬────────────┬─────────┐
│ ITEM       │ LOCATION │ AVAILABILITY│ STATUS  │
├────────────┼──────────┼────────────┼─────────┤
│ Product A  │ A-12     │ 18%         │ LOW     │
│ Product B  │ A-13     │ 0%          │ OUT     │
│ Product C  │ B-02     │ 74%         │ NORMAL  │
└────────────┴──────────┴────────────┴─────────┘
```

Table rules:

- Clear column headers
- Comfortable row height
- Minimal borders
- Status indicators
- Hover state
- Sort controls where useful
- Pagination for large datasets

---

# 19. Charts

Charts must communicate information quickly.

Use:

- Line charts
- Bar charts
- Area charts sparingly
- Donut charts only when genuinely useful
- Heatmaps
- Small trend indicators

Avoid:

- 3D charts
- Decorative charts
- Excessive gradients
- Overly complex visualizations

---

# 20. Chart Design

Each chart should have:

```text
Title
↓
Time/context
↓
Chart
↓
Optional short insight
```

Example:

```text
SHOPPER TRAFFIC

Today · 08:00–20:00

       ╭──────╮
  ─────╯      ╰──────

Peak: 18:00
```

Do not make users decode the chart without context.

---

# 21. Store Map

The store visualization should look like a **simplified architectural floor plan**.

Use:

- Straight walls
- Simple zones
- Shelf blocks
- Checkout blocks
- Entrances
- Labels
- Small status markers

Avoid:

- Realistic 3D supermarket graphics
- Isometric game-like maps
- Excessive gradients
- Decorative terrain

The visual language should resemble a **professional floor-plan drawing**.

---

# 22. Map Visual Hierarchy

```text
STORE STRUCTURE
      ↓
ZONES
      ↓
OPERATIONAL ELEMENTS
      ↓
LIVE INDICATORS
```

The floor plan should remain understandable even when live indicators are active.

---

# 23. Live Indicators

Use small visual markers.

Example:

```text
● Normal
● Attention
● Critical
```

People or activity indicators should remain visually subtle.

Do not turn the map into a sea of animated dots.

---

# 24. Heatmaps

Heatmaps should use controlled intensity.

The underlying store layout must remain visible.

Avoid highly saturated rainbow heatmaps.

Prefer a limited tonal scale.

The heatmap should answer:

> "Where is activity concentrated?"

without becoming visually distracting.

---

# 25. Alerts

Alerts should use hierarchy.

### Critical

```text
🔴 Critical
Immediate attention required
```

### Warning

```text
🟠 Attention
Action recommended
```

### Informational

```text
🔵 Information
Useful system information
```

### Resolved

```text
🟢 Resolved
Previously active issue
```

Avoid browser-style alert popups for every event.

---

# 26. Alert Panel

Recommended structure:

```text
ACTIVE ALERTS

┌─────────────────────────────────┐
│ 🔴 Counter 03                   │
│ Queue requires attention        │
│ 2 min ago                       │
├─────────────────────────────────┤
│ 🟠 Shelf A12                    │
│ Replenishment required          │
│ 5 min ago                       │
└─────────────────────────────────┘
```

---

# 27. Buttons

Buttons should look like normal professional software controls.

### Primary

Solid background.

### Secondary

White/background with border.

### Tertiary

Text-only.

Example:

```text
[ Save Changes ]   [ Cancel ]
```

Avoid:

- Giant pill buttons
- Glowing buttons
- Gradient buttons
- Excessively rounded buttons

---

# 28. Button Radius

Recommended:

```text
6px
```

Small controls may use:

```text
4–6px
```

Large controls:

```text
6–8px
```

Do not make every button completely pill-shaped.

---

# 29. Inputs

Inputs should be straightforward.

```text
Store Name
┌─────────────────────────────┐
│ Main Store                  │
└─────────────────────────────┘
```

Use:

- Clear labels
- Visible focus state
- Comfortable height
- Clear validation
- Helpful placeholder text

Never rely only on placeholder text as the field label.

---

# 30. Status Indicators

Use a combination of:

```text
Dot + Text
```

rather than color alone.

Example:

```text
● Operational
● Attention
● Critical
```

This improves accessibility.

---

# 31. Icons

Use a consistent outline icon family.

Recommended libraries:

- Lucide
- Heroicons

Icons should support the text rather than replace it.

Avoid using random icon styles throughout the application.

---

# 32. Icon Rules

Do:

```text
Inventory    [box icon]
Queues       [users icon]
Analytics    [chart icon]
Settings     [gear icon]
Devices      [server/device icon]
```

Don't use:

```text
🤖 🧠 ✨ 🚀 🔮
```

as the primary visual language.

The interface should feel professional rather than playful.

---

# 33. Navigation Patterns

Use:

- Sidebar navigation
- Tabs
- Breadcrumbs where necessary
- Filters
- Search
- Date selectors
- Store selectors

Avoid excessive nested menus.

A user should generally reach an important section within:

```text
1–2 clicks
```

---

# 34. Filters

Filters should appear above data-heavy sections.

Example:

```text
[ Store ▼ ] [ Zone ▼ ] [ Date ▼ ] [ Status ▼ ] [ Search ]
```

Keep filters compact.

Do not hide essential filters inside complicated modal interfaces.

---

# 35. Date Selection

Use familiar date controls.

Examples:

```text
Today
Yesterday
Last 7 days
Last 30 days
Custom
```

For analytics screens, allow quick date selection without requiring manual date entry every time.

---

# 36. Responsive Design

The desktop dashboard is the primary interface.

However, the interface must remain usable on:

- Laptop
- Desktop monitor
- Tablet
- Smaller screens

---

# 37. Tablet Behavior

On tablets:

```text
Sidebar
   ↓
Collapsible navigation
```

Cards should reflow from:

```text
4 columns
```

to:

```text
2 columns
```

---

# 38. Mobile Behavior

Mobile should prioritize operational information.

Recommended order:

```text
Critical Alerts
↓
Current Status
↓
Important Metrics
↓
Operational Data
↓
Detailed Analytics
```

Large complex tables may become horizontally scrollable or transform into compact list rows.

---

# 39. Loading States

Never leave an empty white area while data loads.

Use skeleton placeholders.

Example:

```text
┌─────────────────────────┐
│ ███████████             │
│                         │
│ █████                   │
└─────────────────────────┘
```

Skeletons should be subtle.

Avoid flashy loading animations.

---

# 40. Empty States

Empty states should explain what happened.

Bad:

```text
No data.
```

Better:

```text
No alerts

Everything is currently operating normally.
```

For configuration:

```text
No devices configured

Add a device to begin monitoring this store.
```

---

# 41. Error States

Errors must explain:

1. What happened
2. What the user can do
3. Whether the system is still usable

Example:

```text
Unable to load analytics

The latest data could not be retrieved.

[ Try Again ]
```

Avoid exposing technical stack traces to normal users.

---

# 42. Offline / Connection State

Connectivity information should be visible but unobtrusive.

Example:

```text
● ONLINE
```

or:

```text
● LOCAL MODE
```

or:

```text
● SYNCING
```

Do not use giant warning banners unless user action is actually required.

---

# 43. Animations

Animations should communicate state changes.

Allowed:

- Subtle fade
- Small transitions
- Table updates
- Chart transitions
- Sidebar transitions
- Modal transitions

Avoid:

- Constant pulsing
- Floating cards
- Excessive bouncing
- Glowing animations
- Decorative particle effects

Animation duration:

```text
150–250ms
```

for most interface interactions.

---

# 44. Hover States

Interactive elements should provide clear feedback.

Examples:

```text
Card
→ Slight border emphasis

Button
→ Background change

Table row
→ Subtle surface change

Navigation item
→ Background highlight
```

No glow effects.

---

# 45. Accessibility

The interface must be usable by people with different levels of technical knowledge.

Requirements:

- Strong text contrast
- Visible focus states
- Status not communicated by color alone
- Readable font sizes
- Clear labels
- Large enough click targets
- Keyboard navigation
- Tooltips for unfamiliar icons
- No essential information hidden only behind hover

---

# 46. Dashboard Density

The dashboard should use **moderate information density**.

Not:

```text
Too empty
████████████████████
```

and not:

```text
Everything everywhere
████████████████████
████████████████████
████████████████████
████████████████████
```

Target:

> Enough information to make decisions without feeling overwhelmed.

---

# 47. Screen Structure

Every major screen should follow a consistent pattern.

```text
PAGE TITLE
Short contextual description

PRIMARY CONTENT

Secondary content

Supporting information
```

Example:

```text
Inventory

Monitor current store availability.

[ Filters ]

Inventory table

Recent changes
```

---

# 48. Dashboard Structure

The main dashboard should follow:

```text
Header
↓
Key status summary
↓
Primary operational visualization
↓
Alerts / actions
↓
Supporting analytics
```

Avoid putting every available metric on the first screen.

---

# 49. Detail Pages

Detail pages should focus on one operational area.

Structure:

```text
Back / Breadcrumb

Page title

Summary

Primary visualization / table

Detailed information

Related activity
```

Use progressive disclosure so advanced information does not overwhelm beginners.

---

# 50. Modals

Use modals only for focused tasks.

Good uses:

- Confirm action
- Edit configuration
- Add item
- View important details

Avoid putting complete dashboards inside modals.

---

# 51. Notifications

Notifications should be useful rather than noisy.

Use:

```text
Critical → Immediate
Warning → Visible
Information → Quiet
Resolved → Historical
```

Do not notify the user repeatedly for the same unchanged condition.

---

# 52. Data Formatting

Numbers should be easy to scan.

Use:

```text
248
1,284
94%
04:32
₹12,450
```

Avoid unnecessary decimals.

Bad:

```text
248.000000
```

Better:

```text
248
```

---

# 53. Time Formatting

Use human-readable formats.

Prefer:

```text
2 min ago
Today, 18:42
18:42
04:32
```

Avoid unnecessarily technical timestamps in the main interface.

---

# 54. Confidence / Technical Data

Technical information should be available when useful but should not dominate the primary UI.

Example:

```text
Status
High

Details
Confidence: 91%
Model: Person Detector
```

Advanced technical information can live inside a detail drawer or expandable section.

---

# 55. Progressive Disclosure

The application should have two information levels.

### Level 1 — Everyday User

```text
Status
Problem
Impact
Recommended action
```

### Level 2 — Technical / Administrator

```text
Confidence
Device
Model
Timestamp
Event ID
Technical diagnostics
```

This keeps the system approachable without removing technical depth.

---

# 56. Design Language for AI

AI should be represented through **useful intelligence**, not decorative AI branding.

Avoid:

```text
✨ AI INSIGHT
🤖 SMART AI
🧠 AI MAGIC
```

Prefer:

```text
Recommendation
Trend detected
Attention required
Predicted risk
Operational insight
```

The user should experience the intelligence rather than constantly seeing the word "AI".

---

# 57. Design Language for Hardware

Hardware information should resemble an operations console.

Example:

```text
DEVICES

● Connected
● Local
● Syncing
○ Offline
```

Device cards should show:

```text
Device Name
Connection
Last activity
Status
```

Avoid futuristic hardware graphics.

---

# 58. Design Language for the Store

Use a **digital blueprint** visual identity.

The store should feel like a real physical environment translated into software.

Use:

- Straight lines
- Zones
- Labels
- Simple blocks
- Grid alignment
- Operational markers

This becomes a distinctive visual identity for the product.

---

# 59. Design Language for Reports

Reports should feel printable and professional.

Use:

```text
Report title
Date range
Summary
Charts
Tables
Key findings
```

Avoid highly decorative report layouts.

---

# 60. Brand Personality

The product should communicate:

```text
Reliable
Practical
Precise
Calm
Professional
Modern
Accessible
```

It should NOT communicate:

```text
Experimental
Cyberpunk
Futuristic
Playful
Gaming
Sci-fi
AI-generated
```

---

# 61. Recommended UI Component Library

For implementation, use a consistent component system.

Recommended:

```text
React
TypeScript
Tailwind CSS
shadcn/ui
Lucide Icons
```

Components should be customized to match this design system rather than using the default appearance of a component library.

---

# 62. Component Rules

Every component must follow:

```text
Same radius
Same spacing scale
Same typography hierarchy
Same border treatment
Same interaction behavior
Same status language
```

Do not create a different visual style for every page.

---

# 63. Desktop Reference Layout

The target visual hierarchy should approximately resemble:

```text
┌───────────────────────────────────────────────────────────────────┐
│ BRAND                     PAGE TITLE        STORE ● OPERATIONAL  │
├───────────────┬───────────────────────────────────────────────────┤
│               │                                                   │
│ COMMAND       │  KEY METRICS                                     │
│               │                                                   │
│ Overview      │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│               │  │        │ │        │ │        │ │        │   │
│ OPERATIONS    │  │ METRIC │ │ METRIC │ │ METRIC │ │ METRIC │   │
│ Shoppers      │  │        │ │        │ │        │ │        │   │
│ Inventory     │  └────────┘ └────────┘ └────────┘ └────────┘   │
│ Queues        │                                                   │
│               │  ┌───────────────────────────┐ ┌───────────────┐ │
│ INSIGHTS      │  │                           │ │               │ │
│ Analytics     │  │                           │ │    ALERTS     │ │
│ Reports       │  │        STORE MAP          │ │               │ │
│               │  │                           │ │               │ │
│ SYSTEM        │  │                           │ │               │ │
│ Devices       │  └───────────────────────────┘ └───────────────┘ │
│ Settings      │                                                   │
│               │  ┌─────────────────────────────────────────────┐ │
│               │  │                 ANALYTICS                   │ │
│               │  └─────────────────────────────────────────────┘ │
└───────────────┴───────────────────────────────────────────────────┘
```

---

# 64. Visual Consistency Checklist

Before considering a page complete, verify:

### Layout

- [ ] Grid alignment is consistent
- [ ] Spacing follows the spacing scale
- [ ] Sidebar remains consistent
- [ ] Header remains consistent

### Typography

- [ ] Inter is used
- [ ] Heading hierarchy is clear
- [ ] Labels are concise
- [x] Numbers are easy to scan

### Components

- [ ] Border treatment is consistent
- [ ] Corner radius is consistent
- [ ] Buttons follow the same style
- [ ] Icons use the same library

### Color

- [ ] Light theme only
- [ ] Status colors have semantic meaning
- [ ] No unnecessary gradients
- [ ] No neon colors
- [ ] No glass effects

### UX

- [ ] Important information is easy to find
- [ ] Actions are obvious
- [ ] Errors are understandable
- [ ] Empty states are useful
- [ ] Technical details are hidden until needed

---

# 65. Final Design Rule

The most important rule of the entire interface:

> **Make it look like a professional retail operations product first and an AI product second.**

The visual identity should come from:

```text
STORE
   +
OPERATIONS
   +
DATA
   +
CLARITY
```

not from:

```text
AI
+
GLOW
+
GRADIENT
+
FUTURISTIC EFFECTS
```

The finished application should look believable as a product that a supermarket, pharmacy, neighborhood store, or retail chain could actually deploy.
