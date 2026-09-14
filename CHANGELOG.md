# Changelog

All notable changes to **AgendaVault** are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.1.0] - 2026-09-14

### Added
- **Personal Sample Vault**:
  - Ingested 103 real-world todo records spanning Health, Code Pipeline, Household, Finance, IoT, Music, and Woodworking.
  - Multi-dimensional Agenda categories applied across all items: `When`, `Project`, `Status`, `Priority`, `People`, `Cost`, and `Tags`.
  - Strict privacy-first redactions applied across all personal identifiers (insurance plan IDs, NPI, phone numbers, state tax IDs, order numbers, software license keys, appliance serials, flight confirmations) while keeping first names intact.
  - Exported canonical data vault in both JSON (`data/personal_sample_vault.json`) and Lotus Agenda Structured Text File (`data/personal_sample_vault.stf`).
- **1-Click Vault Switcher**:
  - Integrated header dropdown selector (`<select id="vault-select">`) supporting instantaneous switching between:
    - 🚀 **Demo Vault** (Classic Lotus Agenda / Death Star project)
    - 👤 **Personal Sample Vault** (103 imported todo items)
  - Isolated LocalStorage persistence (`agendavault_data_v1_demo` vs `agendavault_data_v1_personal`) ensuring edits in one vault never bleed into another.
  - Preset reset option with safety guards (`skipSaveCurrent`) preventing stale memory states from overwriting fresh restores.
- **Lotus Agenda PowerPack & President's Planner (`ppdoc.pdf`)**:
  - **Workspace Templates**: Pre-packaged views for *President's Planner*, *Project Manager*, and *Daily Journal*.
  - **Item Templates**: Boilerplate expanders for *Meeting*, *Phone Call*, *Project Task*, and *Bug Report* with dynamic runtime variables (`{date}`, `{time}`, `{user}`, `{priority}`, `{project}`, `{people}`).
  - **Agenda Macro Language**: Deterministic curly-brace syntax (`{ADD}`, `{SET}`, `{FILTER}`, `{VIEW}`, `{ROLLOVER}`, `{TRIAGE}`, `{DELEGATE}`, `{DONE}`, `{TOGGLE}`, `{DELETE}`) with `Alt+1` through `Alt+5` execution triggers.
  - **Prompt-Based AI Macro Interpreter**: Freeform natural language instruction synthesizer (e.g. *"mark done"*, *"delete this task"*, *"filter urgent death star tasks"*, *"delegate to Sarah due Friday"*).
  - **DWIM Data Utilities**:
    - `? Ambiguous Statements` triage center (`F7`) with 1-click resolution pills and permanent dismissal tracking.
    - Perpetual Tracking (Rollover): Overdue tasks bumped forward to Today with immutable audit timestamps in attached notes.
    - Delegation & Promises tracker for commitments made by or assigned to others.
    - Scratch Pad multi-dimensional auto-classifier for rapid brain dumps.
- **Testing & Quality Assurance**:
  - Automated unit test suite expanded to **34 comprehensive invariant tests** in `tests/test-suite.js`.
  - All 34 tests execute headlessly and pass cleanly (0 errors) via `npm test`.
  - In-browser end-to-end DOM test runner (`tests/test-runner.html` + `tests/e2e-suite.js`) exercising real browser interactions, modal workflows, WikiLinks, and STF import/export.

### Fixed
- Fixed timezone offset midnight shift in date utilities (`formatLocalDate`) preventing off-by-one date drift across UTC offsets.
- Fixed space-tolerant Agenda arrow expressions (`<- >`, `<->`, `->`, `<- ->`) in `FilterEngine`.
- Fixed Omnibar keyboard tracking (`hasNavigatedList`) ensuring `Enter` creates new notes while arrow keys navigate existing matches.
- Fixed in-table category editing bindings in `AgendaTableView`.
- Fixed multi-valued category flattening in STF imports and 2D matrix cross-tab calculations.

---

## [v1.0.0] - 2026-09-13

### Added
- **Initial Release of AgendaVault**:
  - 100% duplication of Lotus Agenda 1989 core subsystems (Items, Categories, Facets, Assignment Rules, AST Filter Expressions, Sections View, Table View, Datebook View, Expense View, 2D Matrix Cross-Tabs).
  - nvALT search-and-create Omnibar with real-time incremental filtering and NLP chip previews.
  - Side-by-side MultiMarkdown editor with live HTML preview, word count, and `[[WikiLinks]]`.
  - Authentic 1989 MS-DOS VGA CRT green/amber monochrome theme (`theme-retro-dos`) and modern dark/light themes.
  - Full bidirectional `.stf` (Structured Text File) format import and export.
