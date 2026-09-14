# AgendaVault

> **A unified Personal Information Manager combining 100% of Lotus Agenda's multi-dimensional categorization and views with nvALT's effortless search-and-create note-taking workflow.**

Inspired by:
- [Brett Terpstra's nvALT (Notational Velocity ALT)](https://brettterpstra.com/projects/nvalt/)
- [Tavis Ormandy's deep-dive on Lotus Agenda](https://lock.cmpxchg8b.com/lotusagenda.html)

---

## Key Highlights

### 1. Lotus Agenda Core Subsystems (100% Duplicated)
- **Items & Attached Notes**: Headline items (up to 350 chars) with attached multi-line Markdown notes.
- **Categories & Value Facets**:
  - `When` (Dates, Times, Recurrences, Deadlines)
  - `Priority` (Urgent, High, Medium, Low)
  - `Project` (Death Star, Website Redesign, Finance & Compliance, Personal)
  - `People` (Sarah, Tom, Bob, Mom, etc.)
  - `Status` (Pending, In Progress, Blocked, Done, Archived)
  - `Type` (Call, Meeting, Task, Milestone)
  - `Cost` (Monetary values with subtotal aggregation)
  - Custom user-defined hierarchical and multi-value categories.
- **Natural Language Processing (NLP) & Date Parsing Engine**:
  - Parses relative dates: *"today"*, *"tomorrow"*, *"yesterday"*, *"day before yesterday"*
  - Parses time offsets: *"in 3 days"*, *"in 2 weeks"*, *"a week from today"*, *"3 days ago"*
  - Parses weekdays: *"this Friday"*, *"next Tuesday"*, *"last Monday"*
  - Parses recurrence: *"every four months starting Tuesday"*, *"daily"*, *"weekly"*
  - Extracts entities: `@Person`, `+Project`, `#tag`, `!priority`, `$1,250.00`
- **Dynamic Assignment Rules**:
  - Evaluates item text and category conditions to auto-assign categories (e.g., text contains "call" $\rightarrow$ Type: Call; Project: Death Star $\rightarrow$ Priority: Urgent).
- **Custom Agenda Views & Dashboards**:
  - **Main Dashboard**: Tavis Ormandy's classic 3-section layout (*Due within a week*, *No due date*, *Recently completed*).
  - **Project Planner**: Grouped by Project with due dates, priority, and status columns.
  - **Datebook Timeline**: Chronological calendar agenda of dated items.
  - **Expense View**: Numeric cost tracker with category subtotals and grand total.
  - **Matrix Cross-Tab**: 2-dimensional cross-referencing matrix (Rows $\times$ Columns).
- **Agenda Boolean Filter Expressions**:
  - Evaluates syntax like:
    - `[-Done, When(<- > A week from today)]`
    - `[-Done, -When]`
    - `[Done(2 days ago <->)]`
    - `[+Priority:High, -Status:Done]`
- **STF (Structured Text File) Import & Export**:
  - Full roundtrip serialization and parsing of Lotus Agenda's native `.stf` data interchange format.
  - Modern JSON export & Markdown document export.
- **Retro DOS 1989 Mode**:
  - Authentic VGA text mode styling with monospace typography, cyan labels, bright yellow inputs, and F-key footer navigation.

### 2. nvALT Capabilities Integrated
- **The Omnibar (Unified Search & Create)**:
  - Real-time incremental search filtering across all headlines, notes, and tags.
  - If query doesn't match an item, pressing `Enter` immediately creates a new item with that exact text and runs it through the Agenda NLP engine.
  - `Shift+Enter` forces item creation.
  - Instant live NLP preview chip badge showing detected date, project, priority, and person before submitting.
- **MultiMarkdown Note Editor & Live Preview**:
  - Side-by-side split view or full-focus view.
  - Live preview with GitHub/MultiMarkdown syntax, task lists (`- [ ]`), code blocks, and blockquotes.
  - Real-time word count, character count, and estimated reading time.
- **`[[WikiLinks]]`**:
  - Link items and notes with `[[WikiLink]]` syntax.
  - Autocompletes and navigates to linked notes on click (or prompts to create if not existing).
- **Keyboard-First Ergonomics**:
  - `Ctrl+L` or `/`: Focus Omnibar
  - `F6`: Category & Assignment Rules Manager
  - `F8` / `Alt-N` / `Alt-P`: Switch & Cycle Views
  - `Alt-F3`: Macro Manager & Automation
  - `Ctrl+S`: Save Note

### 3. President's Planner (ppdoc.pdf) PowerPack Enhancements
- **Workspace & Database Templates (`.AG`)**:
  - **President's Planner (`PLANNER.AG`)**: Full PIM architecture with Scratch Pad, Follow-ups, Delegated Promises, Activities log, and Ambiguous Statements triage.
  - **GTD Executive Planner (`GTD.AG`)**: Context-based next actions (`@Calls`, `@Computer`, `@Errands`, `@WaitingFor`).
  - **Software Engineering Tracker (`PROJECTS.AG`)**: Sprint board, defect severity triage, component tagging.
- **Item & Note Boilerplate Expansion Templates**:
  - `meeting_note`: Pre-formatted meeting record with attendees, agenda, discussion notes, and action item checklist.
  - `delegated_promise`: Commitment tracker recording responsible party, check-in milestones, and deliverable specs.
  - `expense_voucher`: Financial purchase entry with vendor details, cost allocation, and receipt checklist.
  - `bug_report`: Structured defect ticket with reproduction steps, expected vs actual behavior, and environment.
  - `daily_journal`: Top 3 Priorities, discoveries, and evening reflection retro.
  - Quick access via `F9`, the **Templates** button, or Omnibar (`/template meeting` or `/t`).
- **Agenda Macro Command Language `{COMMAND args}`**:
  - Scriptable curly-brace command syntax for automated workflows:
    - `{VIEW <name_or_id>}`: Switch view
    - `{FILTER <expression>}`: Apply filter expression
    - `{SEARCH <query>}`: Instant incremental search
    - `{ASSIGN <cat> <val>}`: Assign category to selected or visible items
    - `{ADD <text> [when:...] [project:...] [priority:...] [people:...] [cost:...]}`: Add structured item
    - `{ROLLOVER [days]}`: Reschedule overdue tasks to Today with audit trail
    - `{ARCHIVE}`: Archive completed items
    - `{PURGE}`: Permanently delete completed items
    - `{RULES}`: Re-evaluate all Agenda assignment rules
    - `{DELEGATE <person> [due:<date>]}`: Assign task delegation
    - `{TRIAGE}`: Switch to `? Ambiguous Statements` view
    - `{TEMPLATE <name>}`: Instantiate item template
    - `{THEME <dos|dark|light>}` / `{LAYOUT <layout>}`: Appearance controls
- **Prompt-Based AI Macro Automation**:
  - Natural language instruction interpreter: translates freeform instructions (e.g. *"Roll overdue tasks to today and reapply rules"*, *"Delegate Death Star review to Sarah by Friday"*) into native Agenda macro sequences.
  - Interactive Macro Manager console (`Alt-F3`) with execution logs and custom macro shortcut keys (`Alt+1` through `Alt+5`).
- **President's Planner Key Data Utilities**:
  - **Top-Screen Scratch Pad with DWIM (Do-What-I-Mean)**: Fast entry bar that automatically distinguishes phone calls, appointments, follow-ups, and expenses.
  - **"? Ambiguous Statements" Triage Center (`F7`)**: Automatic detection of items missing dates, projects, or owners with 1-click fast-resolution pills.
  - **Perpetual Tracking & Date Rollover**: Bump past-due items to Today while recording an immutable audit trail in the attached note.
  - **Delegation & Commitment Tracker**: Dedicated view and filters for promises made by or delegated to others.

---

## File Structure

```text
├── index.html                       # Main application interface with Omnibar, Viewport, Editor
├── README.md                        # Documentation & architecture guide
├── css/
│   ├── styles.css                   # Modern styling & typography (DM Sans / JetBrains Mono)
│   └── retro-dos.css                # Authentic 1989 Lotus Agenda MS-DOS VGA CRT theme
├── js/
│   ├── app.js                       # Main application controller, event bus, and shortcut router
│   ├── models/
│   │   ├── Item.js                  # Item model with notes & category mappings
│   │   ├── Category.js              # Category & CategoryValue models with keywords
│   │   ├── Rule.js                  # Condition-action assignment rules
│   │   ├── View.js                  # View definitions (sections, columns, filters)
│   │   └── Template.js              # WorkspaceTemplate and ItemTemplate models
│   ├── services/
│   │   ├── nlpEngine.js             # Natural language dates and entity parser
│   │   ├── filterEngine.js          # Agenda boolean filter evaluator & nvALT search
│   │   ├── stfService.js            # Lotus Agenda .stf parser and serializer
│   │   ├── storageService.js        # LocalStorage persistence & sample data
│   │   ├── templateService.js       # Workspace & Item note boilerplate engine
│   │   ├── macroEngine.js           # Agenda macro parser, prompt translator, and hotkeys
│   │   └── dataUtilities.js         # Ambiguous triage, perpetual rollover, and delegation
│   └── components/
│       ├── Omnibar.js               # nvALT search & create bar with live NLP chips
│       ├── AgendaSectionsView.js    # Grouped section dashboard (classic Agenda)
│       ├── AgendaTableView.js       # Multi-column table view with sorting
│       ├── AgendaDatebookView.js    # Calendar timeline schedule view
│       ├── AgendaExpenseView.js     # Expense tracker with subtotals
│       ├── AgendaMatrixView.js      # 2D cross-tabulation matrix view
│       ├── NoteEditor.js            # MultiMarkdown editor, live preview, [[WikiLinks]]
│       ├── CategoryManagerModal.js  # Category, values, keywords, and rules builder
│       ├── MacroManagerModal.js     # Macro runner, CLI interpreter, prompt synthesizer, hotkeys
│       ├── TemplateManagerModal.js  # Workspace template loader & note boilerplate expander
│       ├── AmbiguousTriageModal.js  # ? Ambiguous Statements 1-click triage center
│       └── GenerativeUIModal.js     # Natural language task and view synthesizer
└── tests/
    ├── test-runner.html             # In-browser test runner page with interactive filters
    ├── test-suite.js                # Unit and integration tests (NLP, Filters, Rules, STF, Macros, Templates)
    └── e2e-suite.js                 # Browser End-to-End automated test suite
```

---

## Running the Application & Tests

Double-click `index.html` in any browser, or serve it with any local static HTTP server:

```bash
# Using Python:
python -m http.server 8000

# Or using npx:
npx serve .
```

To run the automated test suite:
Open `tests/test-runner.html` in your browser.
Both the **Unit & Integration Suite** and the **Browser End-to-End Suite** will execute automatically and report comprehensive metrics.
