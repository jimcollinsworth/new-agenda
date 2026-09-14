/**
 * macroEngine.js - Lotus Agenda Macro Language & Prompt-Based Automation
 *
 * Implements:
 * 1. Agenda Macro Language Parser & Interpreter (curly brace syntax `{COMMAND args}`)
 * 2. Natural Language Prompt-to-Macro Synthesizer (AI/Prompt-based automation)
 * 3. Custom Macro registry with keyboard shortcuts (e.g. F9-F12, Alt+1..9)
 */

import { DataUtilities } from './dataUtilities.js';
import { Item } from '../models/Item.js';
import { formatLocalDate, addDays } from '../utils/dateUtils.js';

export class MacroEngine {
  constructor(app, options = {}) {
    this.app = app;
    this.storageKey = options.storageKey || 'agendavault_macros_v1';
    this.customMacros = this.loadCustomMacros();
  }

  // --- Parser & Lexer ---
  /**
   * Parse a macro script string into an array of command invocations
   * e.g. "{VIEW Datebook}; {FILTER [-Done]}; {ASSIGN Priority Urgent}"
   * @param {string} script
   * @returns {Array<{ command: string, args: string, params: Object }>}
   */
  parseScript(script) {
    if (!script || typeof script !== 'string') return [];

    const commands = [];
    // Match either {COMMAND ...} or bare statements separated by semicolon
    const pattern = /\{([^{}]+)\}|([^;{}]+)(?=;|$)/g;
    let match;

    while ((match = pattern.exec(script)) !== null) {
      const raw = (match[1] || match[2] || '').trim();
      if (!raw) continue;

      const firstSpace = raw.indexOf(' ');
      let commandName = (firstSpace === -1 ? raw : raw.slice(0, firstSpace)).toUpperCase().trim();
      let rawArgs = (firstSpace === -1 ? '' : raw.slice(firstSpace + 1)).trim();

      // Parse named parameters if any (e.g. when:2026-09-18 project:"Death Star")
      const params = this.parseParams(rawArgs);

      commands.push({
        command: commandName,
        args: rawArgs,
        params
      });
    }

    return commands;
  }

  parseParams(argString) {
    const params = { _rest: [] };
    if (!argString) return params;

    // Matches key:value or key:"quoted string"
    const regex = /(\b[a-zA-Z0-9_-]+):(?:"([^"]+)"|'([^']+)'|([^\s]+))/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(argString)) !== null) {
      const key = match[1].toLowerCase();
      const val = match[2] || match[3] || match[4];
      params[key] = val;
      lastIndex = regex.lastIndex;
    }

    // Clean rest argument without key:value pairs
    const cleaned = argString.replace(/(\b[a-zA-Z0-9_-]+):(?:"([^"]+)"|'([^']+)'|([^\s]+))/g, '').trim();
    params._clean = cleaned;

    return params;
  }

  // --- Command Execution ---
  /**
   * Execute a macro script string across the active application
   * @param {string} script
   * @returns {{ success: boolean, log: Array<string>, results: Array<any> }}
   */
  execute(script) {
    const commands = this.parseScript(script);
    const log = [];
    const results = [];
    let success = true;

    if (commands.length === 0) {
      return { success: false, log: ['Empty or invalid macro script.'], results: [] };
    }

    for (const cmd of commands) {
      try {
        const result = this.dispatchCommand(cmd);
        log.push(`✓ {${cmd.command}} ${cmd.args ? cmd.args : ''} => ${result.message}`);
        results.push(result);
      } catch (err) {
        success = false;
        log.push(`✗ Error in {${cmd.command}}: ${err.message}`);
        results.push({ error: err.message });
        break; // Stop execution on error
      }
    }

    if (this.app) {
      this.app.saveAll();
      this.app.renderCurrentView();
    }

    return { success, log, results };
  }

  dispatchCommand({ command, args, params }) {
    if (!this.app) throw new Error('Application instance not bound to MacroEngine.');

    switch (command) {
      case 'VIEW': {
        const target = args.trim();
        if (!target) throw new Error('Missing view name or ID.');
        const found = this.app.views.find(v =>
          v.id.toLowerCase() === target.toLowerCase() ||
          v.name.toLowerCase() === target.toLowerCase() ||
          v.name.toLowerCase().includes(target.toLowerCase())
        );
        if (!found) throw new Error(`View "${target}" not found.`);
        this.app.switchView(found.id);
        return { message: `Switched to view "${found.name}"` };
      }

      case 'FILTER': {
        const expr = args.trim();
        if (this.app.activeView) {
          this.app.activeView.filterExpression = expr;
          return { message: expr ? `Set filter to: ${expr}` : 'Cleared filter' };
        }
        return { message: 'No active view to filter' };
      }

      case 'SEARCH': {
        const query = args.trim();
        this.app.searchQuery = query;
        if (this.app.omnibar) {
          this.app.omnibar.input.value = query;
        }
        return { message: `Searched for "${query}"` };
      }

      case 'ADD': {
        const headline = params._clean || args;
        if (!headline) throw new Error('ADD requires item headline text.');

        const nlp = this.app.nlpEngine ? this.app.nlpEngine.parse(headline) : { categoryAssignments: {} };
        const categories = { ...nlp.categoryAssignments };

        if (params.when) categories['When'] = params.when;
        if (params.project) categories['Project'] = params.project;
        if (params.priority) categories['Priority'] = params.priority;
        if (params.people) categories['People'] = [params.people];
        if (params.person) categories['People'] = [params.person];
        if (params.status) categories['Status'] = params.status;
        if (params.type) categories['Type'] = params.type;

        let cost = nlp.cost;
        if (params.cost && !isNaN(Number(params.cost))) {
          cost = Number(params.cost);
          categories['Cost'] = cost;
        }

        const item = new Item({
          text: headline,
          note: params.note || '',
          categories,
          cost
        });

        this.app.addItemWithRules(item);
        this.app.selectItem(item.id);
        return { message: `Created item "${item.text}"`, itemId: item.id };
      }

      case 'ASSIGN': {
        const parts = args.trim().split(/\s+/);
        if (parts.length < 2) throw new Error('ASSIGN requires Category and Value (e.g. {ASSIGN Priority Urgent}).');
        const catName = parts[0];
        const catVal = parts.slice(1).join(' ');

        // Apply to selected item if one is active, otherwise to currently filtered view items
        if (this.app.selectedItem) {
          this.app.selectedItem.setCategory(catName, catVal);
          return { message: `Assigned ${catName}: "${catVal}" to selected item` };
        } else {
          const visible = this.app.getFilteredItems();
          const count = DataUtilities.bulkAssignCategory(visible, catName, catVal);
          return { message: `Assigned ${catName}: "${catVal}" to ${count} visible items` };
        }
      }

      case 'ROLLOVER': {
        let days = 0;
        if (args && !isNaN(parseInt(args, 10))) {
          days = parseInt(args, 10);
        }
        const targetDate = formatLocalDate(addDays(new Date(), days));
        const res = DataUtilities.rolloverOverdueItems(this.app.items, targetDate);
        return { message: `Rescheduled ${res.count} overdue items to ${targetDate}`, count: res.count };
      }

      case 'ARCHIVE': {
        const count = DataUtilities.archiveCompletedItems(this.app.items);
        return { message: `Archived ${count} completed items`, count };
      }

      case 'PURGE': {
        const prevCount = this.app.items.length;
        this.app.items = DataUtilities.purgeCompletedItems(this.app.items);
        const removed = prevCount - this.app.items.length;
        return { message: `Permanently purged ${removed} completed items`, removed };
      }

      case 'RULES': {
        let modified = 0;
        const sorted = [...this.app.rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
        this.app.items.forEach(item => {
          sorted.forEach(rule => {
            if (rule.apply(item)) modified++;
          });
        });
        return { message: `Re-evaluated rules across ${this.app.items.length} items (${modified} updates)` };
      }

      case 'DELEGATE': {
        const person = params.to || params.person || (args.split(/\s+/)[0] || '').trim();
        if (!person) throw new Error('DELEGATE requires a person name (e.g. {DELEGATE Sarah due:Friday}).');

        let dueDate = params.due || params.when || null;
        if (dueDate && this.app.nlpEngine) {
          const parsed = this.app.nlpEngine.parse(`by ${dueDate}`);
          if (parsed.when) dueDate = parsed.when;
        }

        if (this.app.selectedItem) {
          DataUtilities.delegateItem(this.app.selectedItem, person, dueDate, params.note);
          return { message: `Delegated selected item to ${person}${dueDate ? ' due ' + dueDate : ''}` };
        } else {
          throw new Error('Please select an item first to delegate.');
        }
      }

      case 'TRIAGE': {
        // Find or switch to Ambiguous Statements view
        let ambView = this.app.views.find(v => v.name.includes('Ambiguous'));
        if (ambView) {
          this.app.switchView(ambView.id);
        } else {
          this.app.activeView.filterExpression = '[-When, -Project]';
        }
        const count = DataUtilities.findAmbiguousItems(this.app.items).length;
        return { message: `Switched to Ambiguous Statements triage (${count} ambiguous items found)`, count };
      }

      case 'TEMPLATE': {
        const tplName = (params._clean || args.split(/\s+/)[0] || '').trim();
        if (!this.app.templateService) throw new Error('TemplateService not initialized.');
        const tpl = this.app.templateService.getItemTemplateById(tplName);
        if (!tpl) throw new Error(`Item Template "${tplName}" not found.`);

        const item = this.app.templateService.instantiateItemTemplate(tpl.id, {
          title: params.title || 'New Item from Macro',
          person: params.person || 'Sarah',
          project: params.project || 'General',
          date: params.date || formatLocalDate(new Date()),
          cost: params.cost || '0'
        });

        this.app.addItemWithRules(item);
        this.app.selectItem(item.id);
        return { message: `Instantiated item template "${tpl.name}"`, itemId: item.id };
      }

      case 'THEME': {
        const theme = args.trim().toLowerCase();
        let normalized = 'retro-dos';
        if (theme.includes('light')) normalized = 'modern-light';
        else if (theme.includes('dark')) normalized = 'modern-dark';
        this.app.applyTheme(normalized);
        return { message: `Applied theme: ${normalized}` };
      }

      case 'LAYOUT': {
        const layout = args.trim().toLowerCase();
        this.app.applyLayout(layout);
        return { message: `Applied layout: ${layout}` };
      }

      case 'EXPORT': {
        const fmt = args.trim().toLowerCase();
        if (fmt.includes('stf')) {
          document.getElementById('btn-export-stf')?.click();
        } else if (fmt.includes('json')) {
          document.getElementById('btn-export-json')?.click();
        } else {
          document.getElementById('btn-export-markdown')?.click();
        }
        return { message: `Triggered ${fmt} export` };
      }

      default:
        throw new Error(`Unknown macro command: {${command}}`);
    }
  }

  // --- Prompt-Based / Natural Language Macro Synthesizer ---
  /**
   * Translates natural language prompt instructions into Agenda macro command sequences
   * e.g. "Roll all overdue tasks to today and reapply rules" -> "{ROLLOVER}; {RULES}"
   * @param {string} prompt
   * @returns {{ macroScript: string, explanation: string }}
   */
  translatePromptToMacro(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return { macroScript: '', explanation: 'No prompt specified.' };
    }

    const clean = prompt.trim();
    const lower = clean.toLowerCase();
    const macroParts = [];
    const explanations = [];

    // Split compound prompts by "and", "then", ";"
    const subPrompts = lower.split(/\b(?:and\s+then|and|then)\b|;/).map(s => s.trim()).filter(Boolean);

    for (const sub of subPrompts) {
      // 1. Rollover / Overdue
      if (/\b(?:roll(?:over)?|reschedule|bump)\b/i.test(sub) && /\b(?:overdue|past\s+due|tasks?)\b/i.test(sub)) {
        if (/\btomorrow\b/i.test(sub) || /\b1\s+day\b/i.test(sub)) {
          macroParts.push('{ROLLOVER 1}');
          explanations.push('Roll overdue items to tomorrow');
        } else {
          macroParts.push('{ROLLOVER}');
          explanations.push('Roll overdue items to today');
        }
        continue;
      }

      // 2. Archive completed
      if (/\barchive\b/i.test(sub) && /\b(?:done|completed|finished)\b/i.test(sub)) {
        macroParts.push('{ARCHIVE}');
        explanations.push('Archive completed items');
        continue;
      }

      // 3. Purge completed
      if (/\b(?:purge|delete|permanently\s+remove)\b/i.test(sub) && /\b(?:done|completed)\b/i.test(sub)) {
        macroParts.push('{PURGE}');
        explanations.push('Purge completed items');
        continue;
      }

      // 4. Re-evaluate / run rules
      if (/\b(?:rules?|assignment\s+rules?)\b/i.test(sub) && /\b(?:run|apply|reapply|eval(?:uate)?)\b/i.test(sub)) {
        macroParts.push('{RULES}');
        explanations.push('Re-evaluate assignment rules');
        continue;
      }

      // 5. Ambiguous Triage
      if (/\b(?:triage|ambiguous)\b/i.test(sub)) {
        macroParts.push('{TRIAGE}');
        explanations.push('Open Ambiguous Statements triage view');
        continue;
      }

      // 6. View switching
      if (/\b(?:switch\s+to|show|view|open)\b/i.test(sub)) {
        if (sub.includes('dashboard')) {
          macroParts.push('{VIEW Main Dashboard}');
          explanations.push('Switch to Main Dashboard');
          continue;
        } else if (sub.includes('project') || sub.includes('planner')) {
          macroParts.push('{VIEW Project Planner}');
          explanations.push('Switch to Project Planner');
          continue;
        } else if (sub.includes('datebook') || sub.includes('calendar')) {
          macroParts.push('{VIEW Datebook Schedule}');
          explanations.push('Switch to Datebook Schedule');
          continue;
        } else if (sub.includes('expense')) {
          macroParts.push('{VIEW Expense View}');
          explanations.push('Switch to Expense View');
          continue;
        } else if (sub.includes('matrix')) {
          macroParts.push('{VIEW Matrix Cross-Tab}');
          explanations.push('Switch to Matrix Cross-Tab');
          continue;
        } else if (sub.includes('nvalt') || sub.includes('note')) {
          macroParts.push('{VIEW nvALT Fast Notes}');
          explanations.push('Switch to nvALT Fast Notes');
          continue;
        }
      }

      // 7. Filtering
      if (/\b(?:filter|isolate)\b/i.test(sub) || (sub.includes('urgent') && !sub.includes('add'))) {
        if (sub.includes('urgent')) {
          macroParts.push('{FILTER [+Priority:Urgent]}');
          explanations.push('Filter to Urgent priority items');
          continue;
        } else if (sub.includes('high priority')) {
          macroParts.push('{FILTER [+Priority:High]}');
          explanations.push('Filter to High priority items');
          continue;
        } else if (sub.includes('not done') || sub.includes('open')) {
          macroParts.push('{FILTER [-Done]}');
          explanations.push('Filter to incomplete items');
          continue;
        }
      }

      // 8. Search
      if (/\b(?:search|find|lookup)\b/i.test(sub)) {
        const queryMatch = sub.match(/\b(?:search|find|lookup)\s+(?:for\s+)?["']?([^"']+)["']?/i);
        if (queryMatch) {
          const q = queryMatch[1].trim();
          macroParts.push(`{SEARCH ${q}}`);
          explanations.push(`Search for "${q}"`);
          continue;
        }
      }

      // 9. Delegation
      if (/\b(?:delegate|assign\s+to)\b/i.test(sub)) {
        let person = null;
        let due = '';

        // Check for "to <Person>"
        const toMatch = sub.match(/\bto\s+([A-Za-z]+)\b/i);
        if (toMatch) {
          person = toMatch[1];
        } else {
          const directMatch = sub.match(/\b(?:delegate|assign)\s+([A-Za-z]+)\b/i);
          if (directMatch) person = directMatch[1];
        }

        const byMatch = sub.match(/\b(?:by|due(?:\s+to)?|on)\s+([A-Za-z0-9\s]+)$/i);
        if (byMatch) {
          due = ` due:${byMatch[1].trim()}`;
        }

        if (person) {
          const capPerson = person.charAt(0).toUpperCase() + person.slice(1).toLowerCase();
          macroParts.push(`{DELEGATE ${capPerson}${due}}`);
          explanations.push(`Delegate to ${capPerson}`);
          continue;
        }
      }

      // 10. Item Templates
      if (/\b(?:template|meeting\s+note|bug\s+report|expense\s+voucher)\b/i.test(sub)) {
        if (sub.includes('meeting')) {
          macroParts.push('{TEMPLATE meeting_note}');
          explanations.push('Create item from Meeting Note template');
          continue;
        } else if (sub.includes('bug')) {
          macroParts.push('{TEMPLATE bug_report}');
          explanations.push('Create item from Bug Report template');
          continue;
        } else if (sub.includes('expense')) {
          macroParts.push('{TEMPLATE expense_voucher}');
          explanations.push('Create item from Expense Voucher template');
          continue;
        }
      }

      // 11. Theme & Layout
      if (/\btheme\b/i.test(sub)) {
        if (sub.includes('dos') || sub.includes('retro')) {
          macroParts.push('{THEME retro-dos}');
          explanations.push('Switch to Retro DOS theme');
          continue;
        } else if (sub.includes('light')) {
          macroParts.push('{THEME modern-light}');
          explanations.push('Switch to Light theme');
          continue;
        } else if (sub.includes('dark')) {
          macroParts.push('{THEME modern-dark}');
          explanations.push('Switch to Dark theme');
          continue;
        }
      }

      // 12. Add new item
      if (/\b(?:add|create|new\s+task|schedule)\b/i.test(sub)) {
        const itemTextMatch = sub.match(/\b(?:add|create|schedule)\s+(?:task\s+)?(?:new\s+item\s+)?(.+)/i);
        if (itemTextMatch) {
          const cleanText = itemTextMatch[1].trim();
          macroParts.push(`{ADD ${cleanText}}`);
          explanations.push(`Add new item "${cleanText}"`);
          continue;
        }
      }
    }

    if (macroParts.length === 0) {
      // Fallback: If starts with an action or task headline, interpret as {ADD ...}
      macroParts.push(`{ADD ${clean}}`);
      explanations.push(`Add item "${clean}"`);
    }

    const script = macroParts.join('; ');
    return {
      macroScript: script,
      explanation: explanations.join('; ')
    };
  }

  // --- Custom User Macros Management ---
  loadCustomMacros() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to load custom macros from localStorage:', e);
    }

    // Default President's Planner built-in macro presets
    return [
      {
        id: 'macro_daily_rollover',
        name: 'Daily Rollover & Rule Sync',
        description: 'Bump all overdue tasks to Today and re-evaluate Agenda assignment rules',
        shortcut: 'Alt+1',
        script: '{ROLLOVER}; {RULES}',
        isBuiltin: true
      },
      {
        id: 'macro_triage',
        name: 'Triage Ambiguous Statements',
        description: "Open President's Planner ambiguous items list for rapid 1-click classification",
        shortcut: 'Alt+2',
        script: '{TRIAGE}',
        isBuiltin: true
      },
      {
        id: 'macro_archive_clean',
        name: 'Archive Done & Clean',
        description: 'Mark completed items as Archived and update view index',
        shortcut: 'Alt+3',
        script: '{ARCHIVE}; {RULES}',
        isBuiltin: true
      },
      {
        id: 'macro_urgent_focus',
        name: 'Urgent Crisis Filter',
        description: 'Isolate top-priority and urgent tasks across all projects',
        shortcut: 'Alt+4',
        script: '{FILTER [+Priority:Urgent]}',
        isBuiltin: true
      },
      {
        id: 'macro_delegated_review',
        name: 'Review Delegated Promises',
        description: 'Show all items delegated to others to check commitment deadlines',
        shortcut: 'Alt+5',
        script: '{VIEW Follow-Ups & Delegated Promises}',
        isBuiltin: true
      }
    ];
  }

  saveCustomMacros(macros) {
    this.customMacros = macros;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(macros));
    } catch (e) {
      console.error('Failed to save macros to localStorage:', e);
    }
  }

  addCustomMacro({ name, description, script, shortcut }) {
    const id = 'macro_' + Math.random().toString(36).substr(2, 9);
    const newMacro = {
      id,
      name: name.trim(),
      description: description || '',
      script: script.trim(),
      shortcut: shortcut || '',
      isBuiltin: false
    };
    this.customMacros.push(newMacro);
    this.saveCustomMacros(this.customMacros);
    return newMacro;
  }

  deleteCustomMacro(id) {
    this.customMacros = this.customMacros.filter(m => m.id !== id);
    this.saveCustomMacros(this.customMacros);
  }

  getMacroByShortcut(shortcutKey) {
    return this.customMacros.find(m => m.shortcut && m.shortcut.toLowerCase() === shortcutKey.toLowerCase()) || null;
  }
}
