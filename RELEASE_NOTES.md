# Release Notes: AgendaVault v1.1.0

**Release Date:** September 14, 2026  
**Tag:** `v1.1.0`  
**Repository:** [jimcollinsworth/new-agenda](https://github.com/jimcollinsworth/new-agenda)

---

## Overview

AgendaVault `v1.1.0` marks a major milestone: transforming the application from a conceptual recreation of Lotus Agenda & nvALT into a battle-tested, production-ready Personal Information Manager (PIM) capable of running real-world personal datasets.

This release introduces:
1. **Personal Sample Vault**: 103 real-world personal todo and project records parsed into multi-dimensional Agenda categories, with privacy redactions and exports in both JSON and Lotus Agenda `.stf`.
2. **1-Click Vault Switcher**: Seamless toggling between the classic demo vault and the personal vault with isolated LocalStorage persistence.
3. **Lotus Agenda PowerPack / President's Planner**: Workspace templates, item templates with runtime variable expansion, curly-brace macro automation, prompt-to-macro translation, and DWIM data utilities (ambiguous statement triage and perpetual overdue rollover).
4. **Comprehensive Automated Test Coverage**: 34 unit tests running headlessly via `npm test` plus an interactive in-browser DOM end-to-end test runner.

---

## What's New in v1.1.0

### 1. Personal Sample Vault & 1-Click Switcher
- **103 Real-World Tasks**: Extracted from personal task archives spanning healthcare, software engineering pipelines, household repairs, financial planning, IoT sensors, music, and woodworking.
- **Multi-Dimensional Categorization**: Every item mapped to `When`, `Project`, `Status`, `Priority`, `People`, `Cost`, and `#tags`.
- **Privacy-First Redaction**: All sensitive numbers (health plan IDs, NPI, phone numbers, state tax IDs, order numbers, software license keys, appliance serials, flight confirmations) sanitized with zero private data leakage. First names (Denise, Dr James, Ilana) remain intact.
- **Vault Switcher**: Accessible directly from the top header (`<select id="vault-select">`), enabling instant switching between Demo and Personal vaults without page reloads.

### 2. Lotus Agenda PowerPack & President's Planner
Inspired by Bob Newell's classic Agenda PowerPack (`ppdoc.pdf`):
- **Workspace Templates**: Pre-configured views for President's Planner, Project Manager, and Daily Journal.
- **Item Templates**: Rapid note boilerplates for Meetings, Phone Calls, Project Tasks, and Bug Reports with dynamic runtime variables (`{date}`, `{time}`, `{user}`, `{priority}`, `{project}`, `{people}`).
- **Macro Command Engine**: Full curly-brace command interpreter (`{ADD ...}`, `{SET ...}`, `{FILTER ...}`, `{VIEW ...}`, `{ROLLOVER}`, `{TRIAGE}`, `{DELEGATE ...}`, `{DONE}`, `{DELETE}`) with hotkey bindings (`Alt+1` through `Alt+5`).
- **Prompt-Based AI Macro Interpreter**: Translates freeform natural language instructions (*"mark done"*, *"delete this task"*, *"filter urgent death star tasks"*) into native Agenda macro execution.
- **DWIM Data Utilities**:
  - `? Ambiguous Statements` Triage (`F7`): Auto-detects items lacking dates or projects with 1-click fast-resolution pills and permanent dismissal tracking.
  - Perpetual Overdue Tracking (`{ROLLOVER}`): Automatically rolls overdue items to Today while recording an immutable audit timestamp in the note.
  - Delegation Tracker: Monitors promises made to or by collaborators.
  - Top-Screen Scratch Pad: Multi-dimensional classifier that sorts brain dumps into tasks, calls, appointments, and expenses.

### 3. Automated Test Suite & Quality Assurance
- **Headless CLI Suite**: 34 unit & integration tests (`tests/test-suite.js`) executing via `npm test` in Node.js (all 34 passing cleanly with 0 errors).
- **In-Browser E2E Runner**: Interactive test dashboard (`tests/test-runner.html`) verifying DOM lifecycle, Omnibar search/create, MultiMarkdown editor, WikiLink navigation, and STF import/export.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/jimcollinsworth/new-agenda.git
cd new-agenda

# Run the local server
npm start
# (or python -m http.server 8000)

# Open in your browser:
# http://localhost:8000

# Run automated tests:
npm test
```
