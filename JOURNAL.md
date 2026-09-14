# Engineering Journal & Architecture Devlog

**Project:** AgendaVault (`new-agenda`)  
**Repository:** [jimcollinsworth/new-agenda](https://github.com/jimcollinsworth/new-agenda)  
**Author:** Jim Collinsworth  

---

## Vision & Inception

The design premise of AgendaVault is the synthesis of two legendary personal information architectures:
1. **Lotus Agenda (1989)**: Mitch Kapor and Ed Belove's revolutionary database-free personal information manager. Agenda treats items as freeform headlines that dynamically populate multi-dimensional views based on category facets, boolean filter expressions, and assignment rules.
2. **nvALT (Brett Terpstra / Notational Velocity)**: The gold standard in keyboard-driven note taking. nvALT's signature innovation is the unified search-and-create Omnibar: typing filters your notes incrementally, and pressing Enter instantly creates a note with that title if no match exists.

The challenge was to combine Agenda's multi-dimensional categorization and views with nvALT's frictionless note-capture and Markdown editor into a modern, zero-dependency web application.

---

## Milestone Devlog

### Milestone 1: Core Subsystems & The Dual-Engine Architecture
- **Headline Items & Markdown Notes**: Items are constrained to concise headlines (up to 200–350 chars), with attached multi-line Markdown notes for deep context.
- **Dynamic Category Facets**: First-class categories (`When`, `Priority`, `Project`, `People`, `Status`, `Type`, `Cost`) plus user-defined hierarchical and multi-valued categories.
- **Filter Engine**: Constructed a recursive AST parser to interpret Agenda's unique expression syntax:
  - Space-tolerant arrow intervals: `When(<- > A week from today)`, `When(-> 2026-09-30)`.
  - Negations and exclusions: `[-Done, -When]`, `[-Status:Done]`.
  - Category equality and inclusion: `[+Priority:High, -Status:Done]`.
  - Natural relative date helpers: `[When(Today)]`, `[When(Overdue)]`, `[Done(2 days ago <->)]`.
- **The Omnibar**: Engineered nvALT's unified search-and-create input with live NLP badge previews that detect dates, projects, people, and priorities in real time before the user presses Enter.
- **Multi-Theme Engine**: Built the authentic 1989 MS-DOS VGA CRT green/amber monochrome theme (`retro-dos.css`) alongside modern dark and light aesthetics.

### Milestone 2: Space-Tolerant Parsing & Timezone Hardening
- **Timezone Invariants**: Discovered and eliminated a subtle UTC midnight date-shift bug where `Date.prototype.toISOString().split('T')[0]` shifted dates to the previous or next day in non-zero UTC offsets. Replaced all date serialization with a timezone-safe `formatLocalDate` utility.
- **Agenda Arrow Tolerances**: Extended the grammar parser to accept space-tolerant variations (`<- >`, `<->`, `<- ->`, `->`, `..`, `to`).
- **Bidirectional STF Interchange**: Implemented a parser and serializer for Lotus Agenda's native Structured Text File (`.stf`) format, ensuring full data interchange with 1980s DOS Agenda databases.

### Milestone 3: Bob Newell's PowerPack & President's Planner
Studied Bob Newell's Lotus Agenda PowerPack documentation (`ppdoc.pdf`) and integrated its signature workflow tools:
- **Workspace & Item Templates**:
  - Pre-built workspace layouts for *President's Planner*, *Project Manager*, and *Daily Journal*.
  - Boilerplate note expanders for *Meetings*, *Phone Calls*, *Project Tasks*, and *Bug Reports* with dynamic runtime variables (`{date}`, `{time}`, `{user}`, `{priority}`, `{project}`, `{people}`).
- **Agenda Macro Command Language**:
  - Scriptable curly-brace syntax (`{ADD ...}`, `{SET ...}`, `{FILTER ...}`, `{VIEW ...}`, `{ROLLOVER}`, `{TRIAGE}`, `{DELEGATE ...}`, `{DONE}`, `{DELETE}`).
  - Prompt-to-Macro interpreter that compiles conversational natural language prompts into deterministic macro operations.
  - Hotkey triggers (`Alt+1` through `Alt+5`).
- **President's Planner DWIM Data Utilities**:
  - `? Ambiguous Statements` Triage (`F7`): Identifies incomplete items and provides 1-click resolution pills with permanent dismissal tracking.
  - Perpetual Overdue Tracking (`{ROLLOVER}`): Automatically rolls past-due tasks forward to Today while preserving an audit trail in the attached note.
  - Delegation & Commitment Tracker: Monitors items delegated to others.
  - Scratch Pad: Fast-entry bar with multi-dimensional heuristic classification.

### Milestone 4: Personal Vault Ingestion & Privacy Hardening
- **Real-World Task Ingestion**: Parsed 103 todo entries spanning healthcare, software engineering pipelines, home automation, finance, and crafts.
- **Strict Privacy Sanitization**: Audited and scrubbed all sensitive identification numbers (health plan IDs, NPI, phone numbers, state tax IDs, order numbers, software license keys, appliance serial numbers, flight confirmations) while preserving first names (Denise, Dr James, Ilana).
- **1-Click Vault Switcher**: Added a header dropdown enabling instant toggling between Demo and Personal vaults with isolated LocalStorage persistence.
- **Stale Memory Protection**: Hardened `resetVaultToPreset()` to bypass saving dirty memory states during a preset reset.

### Milestone 5: Rigorous Automated Verification
- **Unit & Integration Suite**: 34 automated invariant tests in `tests/test-suite.js` covering date math, NLP parsing, Agenda Boolean filters, assignment rules, STF serialization, macro execution, prompt translation, template expansion, and data utilities.
- **Headless Node Runner**: Configured `npm test` to run cleanly without external dependencies.
- **Browser E2E Suite**: Built an interactive in-browser test runner (`tests/test-runner.html` + `tests/e2e-suite.js`) exercising the full DOM component lifecycle, keyboard shortcuts, modal workflows, and STF import/export.

---

## Architectural Principles

1. **Zero External Runtime Dependencies**: Pure ES Modules, vanilla JavaScript, and modern browser standards ensure the application runs everywhere with no build step required.
2. **Data Sovereignty & Local-First**: All data is persisted directly in browser `LocalStorage` with full export capabilities to standard JSON and Lotus Agenda `.stf`.
3. **Keyboard Ergonomics**: Every core operation is bound to single keystrokes or function keys (`/` for Omnibar, `F6` for Categories, `F7` for Triage, `F8` for Views, `F9` for Templates, `Alt-F3` for Macros, `Ctrl+S` for Save).
4. **Deterministic Heuristics Before AI**: Natural language parsing and macro translation use deterministic regex grammars first, ensuring instantaneous execution with zero latency and zero API cost.
