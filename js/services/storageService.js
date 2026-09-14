/**
 * storageService.js - Persistent storage for AgendaVault.
 * Handles LocalStorage / IndexedDB persistence, default seeds, and backup/restore.
 */

import { Item } from '../models/Item.js';
import { Category, CategoryValue } from '../models/Category.js';
import { Rule } from '../models/Rule.js';
import { View } from '../models/View.js';
import { formatLocalDate, addDays } from '../utils/dateUtils.js';

const STORAGE_KEY = 'agendavault_data_v1';
const SETTINGS_KEY = 'agendavault_settings_v1';

export class StorageService {
  constructor() {
    this.storageKey = STORAGE_KEY;
    this.settingsKey = SETTINGS_KEY;
  }

  loadData() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return this.getDefaultData();
      }
      const data = JSON.parse(raw);

      return {
        items: (data.items || []).map(i => Item.fromJSON(i)),
        categories: (data.categories || []).map(c => Category.fromJSON(c)),
        rules: (data.rules || []).map(r => Rule.fromJSON(r)),
        views: (data.views || []).map(v => View.fromJSON(v))
      };
    } catch (e) {
      console.error('Failed to load data from localStorage:', e);
      return this.getDefaultData();
    }
  }

  saveData({ items, categories, rules, views }) {
    try {
      const payload = {
        version: 1,
        savedAt: new Date().toISOString(),
        items: items.map(i => i.toJSON()),
        categories: categories.map(c => c.toJSON()),
        rules: rules.map(r => r.toJSON()),
        views: views.map(v => v.toJSON())
      };
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save data to localStorage:', e);
    }
  }

  loadSettings() {
    try {
      const raw = localStorage.getItem(this.settingsKey);
      if (!raw) return this.getDefaultSettings();
      return { ...this.getDefaultSettings(), ...JSON.parse(raw) };
    } catch (e) {
      return this.getDefaultSettings();
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  getDefaultSettings() {
    return {
      theme: 'retro-dos', // 'retro-dos', 'modern-dark', 'modern-light'
      layout: 'agenda-full', // 'agenda-full', 'nvalt-horizontal', 'nvalt-vertical', 'editor-focus'
      activeViewId: 'view_main_dashboard',
      autoCategorize: true,
      editorFontSize: 14,
      editorFontFamily: 'JetBrains Mono',
      showWordCount: true,
      soundEffects: true
    };
  }

  getDefaultData() {
    const today = new Date();
    const todayStr = formatLocalDate(today);
    const tomorrowStr = formatLocalDate(addDays(today, 1));
    const in3DaysStr = formatLocalDate(addDays(today, 3));
    const in5DaysStr = formatLocalDate(addDays(today, 5));
    const twoDaysAgoStr = formatLocalDate(addDays(today, -2));

    // Default Categories
    const categories = [
      new Category({
        id: 'cat_when',
        name: 'When',
        type: 'date',
        color: '#3b82f6',
        isSystem: true,
        prompt: 'Date or recurring schedule'
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
          new CategoryValue({ name: 'Death Star', keywords: ['death star', 'empire', 'superlaser'], color: '#7c3aed' }),
          new CategoryValue({ name: 'Website Redesign', keywords: ['website', 'frontend', 'ui', 'css'], color: '#2563eb' }),
          new CategoryValue({ name: 'Finance & Compliance', keywords: ['budget', 'tax', 'retention policy', 'audit', 'expense'], color: '#059669' }),
          new CategoryValue({ name: 'Personal', keywords: ['mom', 'home', 'groceries', 'errands'], color: '#db2777' })
        ]
      }),
      new Category({
        id: 'cat_people',
        name: 'People',
        type: 'multi',
        color: '#ec4899',
        isSystem: true,
        values: [
          new CategoryValue({ name: 'Sarah', keywords: ['sarah', 'sarah p.'], color: '#f43f5e' }),
          new CategoryValue({ name: 'Tom', keywords: ['tom', 'thomas'], color: '#0284c7' }),
          new CategoryValue({ name: 'Bob', keywords: ['bob', 'robert'], color: '#10b981' }),
          new CategoryValue({ name: 'Mom', keywords: ['mom', 'mother'], color: '#e11d48' })
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
          new CategoryValue({ name: 'In Progress', keywords: ['in progress', 'doing', 'active'], color: '#0284c7' }),
          new CategoryValue({ name: 'Blocked', keywords: ['blocked', 'waiting'], color: '#e11d48' }),
          new CategoryValue({ name: 'Done', keywords: ['done', 'completed', 'finished'], color: '#16a34a' })
        ]
      }),
      new Category({
        id: 'cat_type',
        name: 'Type',
        type: 'text',
        color: '#06b6d4',
        values: [
          new CategoryValue({ name: 'Call', keywords: ['call', 'phone', 'ring', 'dial'] }),
          new CategoryValue({ name: 'Meeting', keywords: ['meeting', 'sync', 'standup', 'discuss'] }),
          new CategoryValue({ name: 'Task', keywords: ['task', 'implement', 'fix', 'write'] }),
          new CategoryValue({ name: 'Milestone', keywords: ['milestone', 'launch', 'release'] })
        ]
      }),
      new Category({
        id: 'cat_cost',
        name: 'Cost',
        type: 'numeric',
        color: '#14b8a6',
        isSystem: true,
        prompt: 'Monetary amount'
      }),
      new Category({
        id: 'cat_tags',
        name: 'Tags',
        type: 'multi',
        color: '#f59e0b',
        isSystem: true
      })
    ];

    // Default Assignment Rules
    const rules = [
      new Rule({
        name: 'Phone Calls -> Type: Call',
        conditionType: 'text_contains',
        conditionValue: 'call',
        targetCategory: 'Type',
        targetValue: 'Call'
      }),
      new Rule({
        name: 'Meetings -> Type: Meeting',
        conditionType: 'text_contains',
        conditionValue: 'meet',
        targetCategory: 'Type',
        targetValue: 'Meeting'
      }),
      new Rule({
        name: 'Death Star Tasks -> High Priority',
        conditionType: 'category_is',
        conditionParam: 'Project',
        conditionValue: 'Death Star',
        targetCategory: 'Priority',
        targetValue: 'High'
      }),
      new Rule({
        name: 'Urgent Flag -> Priority: Urgent',
        conditionType: 'text_contains',
        conditionValue: 'urgent',
        targetCategory: 'Priority',
        targetValue: 'Urgent'
      })
    ];

    // Default Views (Matching Lotus Agenda & nvALT)
    const views = [
      new View({
        id: 'view_main_dashboard',
        name: 'Main Dashboard',
        description: 'Tavis Ormandy classic 3-section Agenda dashboard (Due this week, No due date, Recently completed)',
        type: 'sections',
        sectionCategory: 'When',
        columns: ['When', 'Priority', 'Project', 'People', 'Status'],
        filterExpression: '',
        isBuiltin: true
      }),
      new View({
        id: 'view_nvalt_notes',
        name: 'nvALT Fast Notes',
        description: 'nvALT style unified fast-search note list with live Markdown preview and wiki-linking',
        type: 'table',
        sectionCategory: 'Project',
        columns: ['Project', 'Priority', 'When', 'People', 'Status'],
        filterExpression: '',
        isBuiltin: true
      }),
      new View({
        id: 'view_project_planner',
        name: 'Project Planner',
        description: 'Items organized by Project with status, due dates, and priority columns',
        type: 'sections',
        sectionCategory: 'Project',
        columns: ['When', 'Priority', 'People', 'Status', 'Cost'],
        filterExpression: '[-Done]',
        isBuiltin: true
      }),
      new View({
        id: 'view_datebook',
        name: 'Datebook Schedule',
        description: 'Agenda Datebook calendar timeline of events and scheduled tasks',
        type: 'datebook',
        sectionCategory: 'When',
        columns: ['When', 'Priority', 'Project', 'People'],
        filterExpression: '[+When]',
        isBuiltin: true
      }),
      new View({
        id: 'view_expense_tracker',
        name: 'Expense View',
        description: 'Agenda numeric expense tracker with category sub-totals and grand total',
        type: 'expense',
        sectionCategory: 'Project',
        columns: ['Project', 'When', 'Cost', 'Status'],
        filterExpression: '[+Cost]',
        isBuiltin: true
      }),
      new View({
        id: 'view_matrix',
        name: 'Matrix Cross-Tab',
        description: 'Agenda 2-dimensional matrix of Projects vs Status',
        type: 'matrix',
        matrixRowCategory: 'Project',
        matrixColCategory: 'Status',
        filterExpression: '',
        isBuiltin: true
      })
    ];

    // Default Items (From Tavis Ormandy's Agenda tour + nvALT markdown notes)
    const items = [
      new Item({
        text: 'Call Sarah this Friday to give her feedback on her proposal',
        note: `### Proposal Review Notes\n\n- Sarah's proposal for the new data architecture is very promising.\n- Need to discuss:\n  1. Memory overhead of the indexing system.\n  2. Sync intervals with DOSEMU host files.\n  3. Timeline for staging environment deployment.\n\n*Reference:* [[Website Redesign]]`,
        categories: {
          When: in5DaysStr,
          People: ['Sarah'],
          Type: 'Call',
          Priority: 'High',
          Project: 'Website Redesign',
          Status: 'In Progress'
        },
        done: false
      }),
      new Item({
        text: 'Check data retention policy every four months starting Tuesday',
        note: `Compliance requirement per data governance board.\n\n- Verify backup snapshots in GCS / local archive.\n- Ensure encrypted logs expire after 90 days.\n- Coordinate with [[Finance & Compliance]] team.`,
        categories: {
          When: in3DaysStr,
          Project: 'Finance & Compliance',
          Priority: 'Medium',
          Status: 'Pending',
          Tags: ['compliance', 'security']
        },
        done: false
      }),
      new Item({
        text: 'Deploy Death Star orbital battlestation',
        note: `### Orbital Deployment Checklist\n\n- [x] Hyperdrive alignment calibrated\n- [ ] Main reactor cooling manifold secured\n- [ ] Superlaser targeting computer verified\n- [ ] Assign flight control staff with [[Tom]]\n\n> "Fear will keep the local systems in line."`,
        categories: {
          When: tomorrowStr,
          Project: 'Death Star',
          Priority: 'Urgent',
          Status: 'In Progress',
          Cost: 450000000
        },
        done: false
      }),
      new Item({
        text: 'Verify Design - Check for thermal exhaust port weak points',
        note: `Analysis of plans reveals an unshielded 2-meter thermal exhaust port leading straight to the main reactor core.\n\n**Action Required:**\n- Ray-shield the port immediately.\n- Schedule review meeting with Chief Architect.`,
        categories: {
          When: todayStr,
          Project: 'Death Star',
          Priority: 'Urgent',
          Status: 'Blocked',
          People: ['Bob']
        },
        done: false
      }),
      new Item({
        text: 'Assign Staff and pilots to defensive tie fighter squadrons',
        note: `Contact [[Tom]] to pull flight rosters from Sector 4 academy.`,
        categories: {
          Project: 'Death Star',
          Priority: 'High',
          Status: 'Pending',
          People: ['Tom']
        },
        done: false
      }),
      new Item({
        text: 'Call Mom this weekend',
        note: `Wish her happy birthday and ask about family reunion date!`,
        categories: {
          When: in5DaysStr,
          People: ['Mom'],
          Priority: 'High',
          Project: 'Personal',
          Type: 'Call',
          Status: 'Pending'
        },
        done: false
      }),
      new Item({
        text: 'Audit cloud infrastructure expenses and server bills $1250',
        note: `Monthly cloud compute run rate breakdown:\n- Production cluster: $750\n- Backup storage & network egress: $320\n- CI/CD build runners: $180\n\nTotal: $1,250.00`,
        categories: {
          When: tomorrowStr,
          Project: 'Finance & Compliance',
          Priority: 'Medium',
          Status: 'Pending',
          Cost: 1250
        },
        done: false
      }),
      new Item({
        text: 'Renew SSL certificates and DNS records $145',
        note: `Wildcard cert for domains and DNSSEC key rotation completed.`,
        categories: {
          When: twoDaysAgoStr,
          Project: 'Website Redesign',
          Priority: 'Low',
          Status: 'Done',
          Cost: 145
        },
        done: true
      }),
      new Item({
        text: 'Configure DOSEMU2 VGA text mode 80x25 font translation',
        note: `Added \`lredir I: \\\\linux\\\\fs\\\\home\\\\user\\\\Documents\` to autoexec.bat.\nWorking flawlessly in terminal escape sequence emulation.`,
        categories: {
          When: twoDaysAgoStr,
          Project: 'Personal',
          Priority: 'Medium',
          Status: 'Done'
        },
        done: true
      })
    ];

    return { items, categories, rules, views };
  }
}
