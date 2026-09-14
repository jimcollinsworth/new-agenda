/**
 * templateService.js - Workspace & Item Template Engine for AgendaVault
 * Inspired by Lotus Agenda 2.0 and President's Planner (ppdoc.pdf) template system.
 */

import { WorkspaceTemplate, ItemTemplate } from '../models/Template.js';
import { Category, CategoryValue } from '../models/Category.js';
import { Rule } from '../models/Rule.js';
import { View } from '../models/View.js';
import { Item } from '../models/Item.js';
import { formatLocalDate, addDays } from '../utils/dateUtils.js';

export class TemplateService {
  constructor() {
    this.workspaceTemplates = this.initWorkspaceTemplates();
    this.itemTemplates = this.initItemTemplates();
  }

  // --- Workspace Starter Templates ---
  initWorkspaceTemplates() {
    const today = new Date();
    const todayStr = formatLocalDate(today);
    const tomorrowStr = formatLocalDate(addDays(today, 1));
    const nextWeekStr = formatLocalDate(addDays(today, 7));

    // 1. President's Planner (PLANNER.AG)
    const presidentsPlanner = new WorkspaceTemplate({
      id: 'presidents_planner',
      name: "President's Planner (PLANNER.AG)",
      description: "Alex Todd's iconic Lotus Agenda PIM: Scratch Pad, Follow-Ups, Delegated Promises, Activities, and Ambiguous Statements triage.",
      badge: 'President’s Planner',
      categories: [
        new Category({
          id: 'cat_when',
          name: 'When',
          type: 'date',
          color: '#3b82f6',
          isSystem: true,
          prompt: 'Due date or appointment time'
        }),
        new Category({
          id: 'cat_priority',
          name: 'Priority',
          type: 'text',
          color: '#ef4444',
          isSystem: true,
          values: [
            new CategoryValue({ name: 'Urgent', keywords: ['urgent', 'emergency', 'asap', '!!!'], color: '#dc2626' }),
            new CategoryValue({ name: 'High', keywords: ['high', 'important', '!'], color: '#ea580c' }),
            new CategoryValue({ name: 'Medium', keywords: ['medium', 'normal'], color: '#ca8a04' }),
            new CategoryValue({ name: 'Low', keywords: ['low', 'minor', 'someday'], color: '#16a34a' })
          ]
        }),
        new Category({
          id: 'cat_project',
          name: 'Project',
          type: 'text',
          color: '#8b5cf6',
          isSystem: true,
          values: [
            new CategoryValue({ name: 'Executive Strategy', keywords: ['strategy', 'vision', 'board'], color: '#7c3aed' }),
            new CategoryValue({ name: 'Operations & Staff', keywords: ['operations', 'staff', 'hr', 'hiring'], color: '#2563eb' }),
            new CategoryValue({ name: 'Client Accounts', keywords: ['client', 'partner', 'contract'], color: '#059669' }),
            new CategoryValue({ name: 'Personal & Home', keywords: ['family', 'home', 'personal'], color: '#db2777' })
          ]
        }),
        new Category({
          id: 'cat_people',
          name: 'People',
          type: 'multi',
          color: '#ec4899',
          isSystem: true,
          values: [
            new CategoryValue({ name: 'Sarah', keywords: ['sarah'], color: '#f43f5e' }),
            new CategoryValue({ name: 'Tom', keywords: ['tom'], color: '#0284c7' }),
            new CategoryValue({ name: 'Bob', keywords: ['bob'], color: '#10b981' }),
            new CategoryValue({ name: 'Alex', keywords: ['alex'], color: '#8b5cf6' })
          ]
        }),
        new Category({
          id: 'cat_type',
          name: 'Type',
          type: 'text',
          color: '#06b6d4',
          values: [
            new CategoryValue({ name: 'Appointment', keywords: ['appointment', 'meet', 'sync'] }),
            new CategoryValue({ name: 'Phone Conversation', keywords: ['call', 'phone', 'ring'] }),
            new CategoryValue({ name: 'Work Task', keywords: ['task', 'implement', 'prepare'] }),
            new CategoryValue({ name: 'Follow-up', keywords: ['followup', 'promised', 'checkin'] }),
            new CategoryValue({ name: 'Expense', keywords: ['cost', 'paid', 'expense', '$'] })
          ]
        }),
        new Category({
          id: 'cat_status',
          name: 'Status',
          type: 'text',
          color: '#10b981',
          isSystem: true,
          values: [
            new CategoryValue({ name: 'Pending', keywords: ['pending', 'todo'], color: '#64748b' }),
            new CategoryValue({ name: 'In Progress', keywords: ['in progress', 'doing'], color: '#0284c7' }),
            new CategoryValue({ name: 'Delegated', keywords: ['delegated', 'waiting'], color: '#f59e0b' }),
            new CategoryValue({ name: 'Done', keywords: ['done', 'completed'], color: '#16a34a' }),
            new CategoryValue({ name: 'Archived', keywords: ['archived'], color: '#475569' })
          ]
        }),
        new Category({
          id: 'cat_delegated',
          name: 'DelegatedTo',
          type: 'text',
          color: '#f59e0b',
          prompt: 'Person responsible for deliverable'
        }),
        new Category({
          id: 'cat_followup_date',
          name: 'FollowUpDate',
          type: 'date',
          color: '#eab308',
          prompt: 'Check-in review date'
        }),
        new Category({
          id: 'cat_cost',
          name: 'Cost',
          type: 'numeric',
          color: '#14b8a6',
          isSystem: true
        })
      ],
      rules: [
        new Rule({
          name: 'Appointments -> Type: Appointment',
          conditionType: 'text_contains',
          conditionValue: 'meet',
          targetCategory: 'Type',
          targetValue: 'Appointment',
          priority: 10
        }),
        new Rule({
          name: 'Calls -> Type: Phone Conversation',
          conditionType: 'text_contains',
          conditionValue: 'call',
          targetCategory: 'Type',
          targetValue: 'Phone Conversation',
          priority: 10
        }),
        new Rule({
          name: 'Follow-up promises -> Type: Follow-up',
          conditionType: 'text_contains',
          conditionValue: 'promise',
          targetCategory: 'Type',
          targetValue: 'Follow-up',
          priority: 15
        }),
        new Rule({
          name: 'Delegated items -> Status: Delegated',
          conditionType: 'category_is',
          conditionParam: 'Type',
          conditionValue: 'Follow-up',
          targetCategory: 'Status',
          targetValue: 'Delegated',
          priority: 5
        })
      ],
      views: [
        new View({
          id: 'pp_dashboard',
          name: "President's Dashboard",
          description: 'Master operational view with pending appointments, tasks, and follow-ups',
          type: 'sections',
          sectionCategory: 'When',
          columns: ['When', 'Priority', 'Project', 'People', 'Type', 'Status'],
          filterExpression: '[-Done]',
          isBuiltin: true
        }),
        new View({
          id: 'pp_activities',
          name: 'Activities & Call Log',
          description: 'Grouped by Type: Appointments, Phone Conversations, and Work Tasks',
          type: 'sections',
          sectionCategory: 'Type',
          columns: ['When', 'People', 'Project', 'Priority', 'Status'],
          filterExpression: '[-Done]',
          isBuiltin: true
        }),
        new View({
          id: 'pp_delegated',
          name: 'Follow-Ups & Delegated Promises',
          description: 'Monitor tasks and promises delegated to others to prevent them falling through cracks',
          type: 'table',
          sectionCategory: 'Project',
          columns: ['DelegatedTo', 'When', 'Project', 'Priority', 'Status'],
          filterExpression: '[+Status:Delegated]',
          isBuiltin: true
        }),
        new View({
          id: 'pp_ambiguous',
          name: '? Ambiguous Statements',
          description: 'President’s Planner triage view for statements without dates, owners, or projects',
          type: 'table',
          sectionCategory: 'Project',
          columns: ['When', 'Project', 'People', 'Priority'],
          filterExpression: '[-When, -Project]',
          isBuiltin: true
        }),
        new View({
          id: 'pp_datebook',
          name: "President's Datebook",
          description: 'Chronological timeline of upcoming appointments and commitments',
          type: 'datebook',
          sectionCategory: 'When',
          columns: ['When', 'Priority', 'Type', 'People'],
          filterExpression: '[+When]',
          isBuiltin: true
        }),
        new View({
          id: 'pp_expenses',
          name: 'Executive Expenses',
          description: 'Track costs and expenditures across accounts and projects',
          type: 'expense',
          sectionCategory: 'Project',
          columns: ['Project', 'When', 'Cost', 'Status'],
          filterExpression: '[+Cost]',
          isBuiltin: true
        })
      ],
      starterItems: [
        new Item({
          text: 'Call Alex Todd this Friday regarding Lotus Agenda PowerPack integration',
          note: `### Discussion Agenda\n- Review DWIM parsing heuristics\n- Coordinate template serialization\n- Test macro execution pipeline`,
          categories: { When: tomorrowStr, People: ['Alex'], Type: 'Phone Conversation', Priority: 'High', Project: 'Executive Strategy', Status: 'In Progress' },
          done: false
        }),
        new Item({
          text: 'Tom promised delivery of Q4 Financial Compliance audit by next week',
          note: `### Follow-up Commitment\n- Scope: Internal accounting and encrypted retention\n- Delegated To: Tom\n- Sign-off required before board presentation.`,
          categories: { When: nextWeekStr, People: ['Tom'], Type: 'Follow-up', Status: 'Delegated', DelegatedTo: 'Tom', Priority: 'Urgent', Project: 'Operations & Staff' },
          done: false
        }),
        new Item({
          text: 'Review quarterly cloud infrastructure invoice $2,450',
          note: `Verify invoice against service usage statements.`,
          categories: { When: todayStr, Project: 'Operations & Staff', Type: 'Expense', Priority: 'Medium', Status: 'Pending', Cost: 2450 },
          done: false
        }),
        new Item({
          text: 'Draft strategic expansion memo for executive committee',
          note: `Prepare high-level roadmap and resource allocation models.`,
          categories: { Priority: 'High', Status: 'Pending' }, // Deliberately undated & no project for ? Ambiguous Statements
          done: false
        })
      ]
    });

    // 2. GTD Executive Planner (GTD.AG)
    const gtdPlanner = new WorkspaceTemplate({
      id: 'gtd_planner',
      name: 'GTD Executive Planner (GTD.AG)',
      description: "David Allen's Getting Things Done: Next Actions, Contexts (@Calls, @Computer, @Errands), Waiting For, and Someday/Maybe.",
      badge: 'GTD Framework',
      categories: [
        new Category({
          id: 'cat_when',
          name: 'When',
          type: 'date',
          color: '#3b82f6',
          isSystem: true
        }),
        new Category({
          id: 'cat_context',
          name: 'Context',
          type: 'text',
          color: '#06b6d4',
          values: [
            new CategoryValue({ name: '@Calls', keywords: ['call', 'phone'] }),
            new CategoryValue({ name: '@Computer', keywords: ['email', 'code', 'write', 'web'] }),
            new CategoryValue({ name: '@Errands', keywords: ['store', 'buy', 'bank', 'post office'] }),
            new CategoryValue({ name: '@Office', keywords: ['desk', 'print', 'file'] }),
            new CategoryValue({ name: '@WaitingFor', keywords: ['waiting', 'delegated'] })
          ]
        }),
        new Category({
          id: 'cat_project',
          name: 'Project',
          type: 'text',
          color: '#8b5cf6',
          isSystem: true,
          values: [
            new CategoryValue({ name: 'Product Launch', keywords: ['product', 'launch'] }),
            new CategoryValue({ name: 'Infrastructure', keywords: ['server', 'cloud'] }),
            new CategoryValue({ name: 'Life & Family', keywords: ['family', 'home'] })
          ]
        }),
        new Category({
          id: 'cat_priority',
          name: 'Priority',
          type: 'text',
          color: '#ef4444',
          isSystem: true,
          values: [
            new CategoryValue({ name: 'Urgent', color: '#dc2626' }),
            new CategoryValue({ name: 'High', color: '#ea580c' }),
            new CategoryValue({ name: 'Medium', color: '#ca8a04' }),
            new CategoryValue({ name: 'Low', color: '#16a34a' })
          ]
        }),
        new Category({
          id: 'cat_status',
          name: 'Status',
          type: 'text',
          color: '#10b981',
          isSystem: true,
          values: [
            new CategoryValue({ name: 'Next Action', color: '#0284c7' }),
            new CategoryValue({ name: 'Waiting For', color: '#f59e0b' }),
            new CategoryValue({ name: 'Someday/Maybe', color: '#64748b' }),
            new CategoryValue({ name: 'Done', color: '#16a34a' })
          ]
        })
      ],
      rules: [
        new Rule({
          name: 'Phone calls -> @Calls',
          conditionType: 'text_contains',
          conditionValue: 'call',
          targetCategory: 'Context',
          targetValue: '@Calls',
          priority: 10
        })
      ],
      views: [
        new View({
          id: 'gtd_next_actions',
          name: 'Next Actions by Context',
          description: 'Filter open next actions categorized by physical context (@Computer, @Calls, @Errands)',
          type: 'sections',
          sectionCategory: 'Context',
          columns: ['Context', 'Priority', 'Project', 'When'],
          filterExpression: '[-Done]',
          isBuiltin: true
        }),
        new View({
          id: 'gtd_waiting_for',
          name: 'Waiting For',
          description: 'Items delegated to other parties or awaiting external responses',
          type: 'table',
          sectionCategory: 'Project',
          columns: ['When', 'Project', 'Priority'],
          filterExpression: '[+Status:Waiting For]',
          isBuiltin: true
        })
      ],
      starterItems: [
        new Item({
          text: 'Email vendor for pricing comparison on new servers',
          note: `Need specifications on 64-core compute nodes.`,
          categories: { Context: '@Computer', Project: 'Infrastructure', Priority: 'High', Status: 'Next Action', When: todayStr }
        }),
        new Item({
          text: 'Awaiting legal feedback on terms of service from Sarah',
          note: `Sent contract draft on Monday. Follow up if no reply by Thursday.`,
          categories: { Context: '@WaitingFor', Project: 'Product Launch', Priority: 'Medium', Status: 'Waiting For', When: tomorrowStr }
        })
      ]
    });

    // 3. Software Engineering & Bug Tracker (PROJECTS.AG)
    const softwareTracker = new WorkspaceTemplate({
      id: 'software_tracker',
      name: 'Software Engineering & Bug Tracker',
      description: 'Sprint planning, defect triage, milestones, and component categorization.',
      badge: 'Engineering',
      categories: [
        new Category({ id: 'cat_when', name: 'When', type: 'date', color: '#3b82f6', isSystem: true }),
        new Category({
          id: 'cat_severity',
          name: 'Severity',
          type: 'text',
          color: '#ef4444',
          values: [
            new CategoryValue({ name: 'Blocker', keywords: ['blocker', 'crash'], color: '#b91c1c' }),
            new CategoryValue({ name: 'Critical', keywords: ['critical'], color: '#dc2626' }),
            new CategoryValue({ name: 'Major', keywords: ['major'], color: '#ea580c' }),
            new CategoryValue({ name: 'Minor', keywords: ['minor', 'cosmetic'], color: '#16a34a' })
          ]
        }),
        new Category({
          id: 'cat_component',
          name: 'Component',
          type: 'text',
          color: '#8b5cf6',
          values: [
            new CategoryValue({ name: 'Frontend / UI', keywords: ['frontend', 'ui', 'css'] }),
            new CategoryValue({ name: 'Backend / Engine', keywords: ['backend', 'parser', 'nlp'] }),
            new CategoryValue({ name: 'Persistence', keywords: ['storage', 'stf', 'db'] })
          ]
        }),
        new Category({
          id: 'cat_status',
          name: 'Status',
          type: 'text',
          color: '#10b981',
          isSystem: true,
          values: [
            new CategoryValue({ name: 'Backlog', color: '#64748b' }),
            new CategoryValue({ name: 'In Progress', color: '#0284c7' }),
            new CategoryValue({ name: 'In Review', color: '#8b5cf6' }),
            new CategoryValue({ name: 'Done', color: '#16a34a' })
          ]
        })
      ],
      rules: [],
      views: [
        new View({
          id: 'eng_board',
          name: 'Sprint Status Board',
          description: 'Engineering items grouped by Backlog, In Progress, In Review, and Done',
          type: 'sections',
          sectionCategory: 'Status',
          columns: ['Severity', 'Component', 'When'],
          filterExpression: '',
          isBuiltin: true
        })
      ],
      starterItems: [
        new Item({
          text: 'Fix memory leak in STF streaming parser',
          note: `Buffer does not dereference discarded chunks during high volume imports.`,
          categories: { Component: 'Backend / Engine', Severity: 'Critical', Status: 'In Progress', When: todayStr }
        })
      ]
    });

    return [presidentsPlanner, gtdPlanner, softwareTracker];
  }

  // --- Item & Note Boilerplate Expansion Templates ---
  initItemTemplates() {
    const meetingNote = new ItemTemplate({
      id: 'meeting_note',
      name: 'Meeting & Conference Note',
      description: 'Pre-formatted meeting record with attendees, agenda, discussion notes, and action item checklist.',
      categoryName: 'Type',
      defaultCategoryValue: 'Meeting',
      categories: { Status: 'In Progress' },
      headlinePattern: 'Meeting: {{title}} with {{person}}',
      bodyPattern: `# 🤝 Meeting: {{title}}
**Date:** {{date}} | **Attendees:** {{person}} | **Project:** {{project}}

## 📋 Agenda
1. Review status and blockers
2. Technical architecture and open questions
3. Next milestone deliverables

## 📝 Discussion & Key Decisions
- 

## ✅ Action Items & Commitments
- [ ] Follow up on specifications with {{person}}
- [ ] Implement required changes before {{date}}
`,
      variables: ['title', 'person', 'date', 'project']
    });

    const delegatedPromise = new ItemTemplate({
      id: 'delegated_promise',
      name: 'Delegated Follow-up / Commitment',
      description: "President's Planner promise tracker: tracks obligations made by or delegated to others.",
      categoryName: 'Type',
      defaultCategoryValue: 'Follow-up',
      categories: { Status: 'Delegated', Priority: 'High' },
      headlinePattern: 'Follow-up: {{person}} promised {{title}}',
      bodyPattern: `# 📌 Delegated Commitment & Follow-Up Record
**Obligation / Deliverable:** {{title}}
**Responsible Party:** {{person}}
**Commitment Due Date:** {{date}}
**Project:** {{project}}

## 🎯 Deliverable Specifications
- Target outcome: 
- Quality criteria:

## 🔄 Check-in Milestones
- [ ] Initial progress check-in
- [ ] Review first draft deliverable
- [ ] Final sign-off & acceptance
`,
      variables: ['title', 'person', 'date', 'project']
    });

    const expenseVoucher = new ItemTemplate({
      id: 'expense_voucher',
      name: 'Expense Voucher & Purchase',
      description: 'Financial expense entry with vendor details, cost allocation, and receipt checklist.',
      categoryName: 'Type',
      defaultCategoryValue: 'Expense',
      categories: { Status: 'Pending' },
      headlinePattern: 'Expense: {{title}} ${{cost}}',
      bodyPattern: `# 💳 Expense Voucher: {{title}}
**Amount:** $\${{cost}} | **Date:** {{date}} | **Project:** {{project}}

## 🧾 Receipt & Vendor Info
- **Vendor / Merchant:** {{vendor}}
- **Payment Method:** Corporate Card / Cash / Transfer
- **Cost Center:** {{project}}
- **Receipt Attached:** [ ] Yes / [ ] No

**Expense Justification:**
- Business purpose for this expense.
`,
      variables: ['title', 'cost', 'date', 'project', 'vendor']
    });

    const bugReport = new ItemTemplate({
      id: 'bug_report',
      name: 'Defect & Bug Report',
      description: 'Structured bug template with steps to reproduce, expected vs actual behavior, and environment info.',
      categoryName: 'Type',
      defaultCategoryValue: 'Work Task',
      categories: { Priority: 'Urgent', Status: 'Pending' },
      headlinePattern: 'Bug: {{title}}',
      bodyPattern: `# 🐛 Defect Report: {{title}}
**Reported Date:** {{date}} | **Priority:** Urgent | **Project:** {{project}}

### 🔍 Steps to Reproduce
1. Open application
2. Execute command or trigger action
3. Observe unexpected failure

### ⚠️ Expected vs Actual
- **Expected:** System executes cleanly without error
- **Actual:** Unexpected behavior occurs

### 💻 Environment & Diagnostics
- Browser / Client:
- Version / Commit:
`,
      variables: ['title', 'date', 'project']
    });

    const dailyJournal = new ItemTemplate({
      id: 'daily_journal',
      name: 'Daily Focus & Retro Journal',
      description: 'Daily planning note with Top 3 Priorities, notes, and evening reflection.',
      categoryName: 'Type',
      defaultCategoryValue: 'Work Task',
      categories: { Priority: 'Medium', Status: 'In Progress' },
      headlinePattern: 'Daily Focus - {{date}}',
      bodyPattern: `# 📓 Daily Focus & Retro: {{date}}

## 🎯 Top 3 Priorities for Today
- [ ] 1. 
- [ ] 2. 
- [ ] 3. 

## 💡 Notes, Decisions & Discoveries
- 

## 🌆 Evening Retro
- What got accomplished?
- Any overdue tasks to roll over?
`,
      variables: ['date']
    });

    return [meetingNote, delegatedPromise, expenseVoucher, bugReport, dailyJournal];
  }

  // --- Lookup & Methods ---
  getWorkspaceTemplates() {
    return this.workspaceTemplates;
  }

  getWorkspaceTemplateById(id) {
    return this.workspaceTemplates.find(t => t.id === id) || null;
  }

  getItemTemplates() {
    return this.itemTemplates;
  }

  getItemTemplateById(id) {
    return this.itemTemplates.find(t => t.id === id || t.name.toLowerCase() === id.toLowerCase()) || null;
  }

  /**
   * Instantiate an ItemTemplate into an Item model ready for insertion
   * @param {string} templateId
   * @param {Object} variables
   * @returns {Item}
   */
  instantiateItemTemplate(templateId, variables = {}) {
    const tpl = this.getItemTemplateById(templateId);
    if (!tpl) throw new Error(`Template "${templateId}" not found.`);

    const expanded = tpl.expand(variables);
    return new Item({
      text: expanded.text,
      note: expanded.note,
      categories: expanded.categories,
      cost: expanded.cost
    });
  }

  /**
   * Apply a WorkspaceTemplate to an application instance
   * @param {string} templateId
   * @param {Object} app - AgendaVault App instance
   * @param {'replace'|'merge'} [mode='replace']
   */
  applyWorkspaceTemplate(templateId, app, mode = 'replace') {
    const tpl = this.getWorkspaceTemplateById(templateId);
    if (!tpl) throw new Error(`Workspace Template "${templateId}" not found.`);

    if (mode === 'replace') {
      app.categories = tpl.categories.map(c => Category.fromJSON(c.toJSON()));
      app.rules = tpl.rules.map(r => Rule.fromJSON(r.toJSON()));
      app.views = tpl.views.map(v => View.fromJSON(v.toJSON()));
      app.items = tpl.starterItems.map(i => Item.fromJSON(i.toJSON()));
      app.activeView = app.views[0];
    } else {
      // Merge mode
      tpl.categories.forEach(tc => {
        if (!app.categories.some(c => c.name.toLowerCase() === tc.name.toLowerCase())) {
          app.categories.push(Category.fromJSON(tc.toJSON()));
        }
      });
      tpl.rules.forEach(tr => {
        if (!app.rules.some(r => r.name === tr.name)) {
          app.rules.push(Rule.fromJSON(tr.toJSON()));
        }
      });
      tpl.views.forEach(tv => {
        if (!app.views.some(v => v.id === tv.id)) {
          app.views.push(View.fromJSON(tv.toJSON()));
        }
      });
      tpl.starterItems.forEach(ti => {
        app.items.unshift(Item.fromJSON(ti.toJSON()));
      });
    }

    if (app.nlpEngine) {
      app.nlpEngine.categoryManager = { categories: app.categories };
    }
    if (app.noteEditor) {
      app.noteEditor.setCategories(app.categories);
      app.noteEditor.setAllItems(app.items);
    }
    app.saveAll();
    app.renderViewSwitcher();
    app.renderCurrentView();

    return {
      templateName: tpl.name,
      itemCount: app.items.length,
      viewCount: app.views.length
    };
  }
}
