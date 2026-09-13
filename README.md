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

---

## File Structure

```text
├── index.html                       # Main application interface
├── README.md                        # Documentation & architecture guide
├── css/
│   ├── styles.css                   # Modern styling & typography (DM Sans / JetBrains Mono)
│   └── retro-dos.css                # Authentic 1989 Lotus Agenda MS-DOS VGA CRT theme
├── js/
│   ├── app.js                       # Main application controller and event bus
│   ├── models/
│   │   ├── Item.js                  # Item model with notes & category mappings
│   │   ├── Category.js              # Category & CategoryValue models with keywords
│   │   ├── Rule.js                  # Condition-action assignment rules
│   │   └── View.js                  # View definitions (sections, columns, filters)
│   ├── services/
│   │   ├── nlpEngine.js             # Natural language dates and entity parser
│   │   ├── filterEngine.js          # Agenda boolean filter evaluator & nvALT search
│   │   ├── stfService.js            # Lotus Agenda .stf parser and serializer
│   │   └── storageService.js        # LocalStorage persistence & sample data
│   └── components/
│       ├── Omnibar.js               # nvALT search & create bar with live NLP chips
│       ├── AgendaSectionsView.js    # Grouped section dashboard (classic Agenda)
│       ├── AgendaTableView.js       # Multi-column table view with sorting
│       ├── AgendaDatebookView.js    # Calendar timeline schedule view
│       ├── AgendaExpenseView.js     # Expense tracker with subtotals
│       ├── AgendaMatrixView.js      # 2D cross-tabulation matrix view
│       ├── NoteEditor.js            # MultiMarkdown editor, live preview, [[WikiLinks]]
│       ├── CategoryManagerModal.js  # Category, values, keywords, and rules builder
│       ├── MacroManagerModal.js     # Macro automation runner and shortcut reference
│       └── GenerativeUIModal.js     # Natural language task and view generator
└── tests/
    ├── test-runner.html             # In-browser test runner page
    └── test-suite.js                # Automated unit and integration tests
```

---

## Running the Application

Double-click `index.html` in any browser, or serve it with any local static HTTP server:

```bash
# Using Python:
python -m http.server 8000

# Or using npx:
npx serve .
```

To run the automated test suite:
Open `tests/test-runner.html` in your browser. All unit tests will run automatically and report results.
