/**
 * dataUtilities.js - President's Planner Data Utilities & DWIM Automation
 * Implements core Lotus Agenda & President's Planner (ppdoc) operational features:
 * - Ambiguous Statements detection & rapid triage
 * - Overdue date roll-forward (perpetual tracking) with audit history
 * - Delegated commitments & follow-up promise tracking
 * - Scratch Pad Do-What-I-Mean (DWIM) multi-dimensional classifier
 * - Batch operations (bulk assign, archive, purge)
 */

import { formatLocalDate, addDays } from '../utils/dateUtils.js';
import { Item } from '../models/Item.js';

export class DataUtilities {
  /**
   * Find items considered "Ambiguous" according to President's Planner rules:
   * 1. Missing 'When' date (undated item)
   * 2. Missing 'Project' classification
   * 3. Missing 'People' for meeting/call/delegated items
   * 4. Missing or conflicting 'Priority' / 'Status'
   * 5. Explicitly flagged as Ambiguous
   * @param {Array<Item>} items
   * @returns {Array<{ item: Item, reasons: Array<string> }>}
   */
  static findAmbiguousItems(items = []) {
    const results = [];

    items.forEach(item => {
      // Completed items don't need ambiguous triage
      if (item.done) return;

      const reasons = [];
      const when = item.getCategory('When');
      const project = item.getCategory('Project');
      const people = item.getCategory('People');
      const type = item.getCategory('Type');
      const priority = item.getCategory('Priority');
      const status = item.getCategory('Status');
      const isAmbiguous = item.getCategory('Ambiguous');

      if (isAmbiguous) {
        reasons.push('Explicitly flagged as ambiguous');
      }

      if (!when) {
        reasons.push('Missing due date (When)');
      }

      if (!project) {
        reasons.push('Unassigned Project');
      }

      if ((type === 'Meeting' || type === 'Call' || status === 'Delegated') && (!people || (Array.isArray(people) && people.length === 0))) {
        reasons.push(`Action type "${type || status}" requires an assigned Person`);
      }

      if (!priority) {
        reasons.push('Unassigned Priority');
      }

      if (reasons.length > 0) {
        results.push({ item, reasons });
      }
    });

    return results;
  }

  /**
   * Rapidly resolve an ambiguous item with updated attributes
   * @param {Item} item
   * @param {Object} updates - e.g. { when: '2026-09-18', project: 'Website', priority: 'High', person: 'Sarah' }
   */
  static resolveAmbiguousItem(item, updates = {}) {
    if (!item) return;

    if (updates.when) {
      item.setCategory('When', updates.when);
    }
    if (updates.project) {
      item.setCategory('Project', updates.project);
    }
    if (updates.priority) {
      item.setCategory('Priority', updates.priority);
    }
    if (updates.person) {
      item.addCategoryValue('People', updates.person);
    }
    if (updates.status) {
      item.setCategory('Status', updates.status);
    }
    if (updates.type) {
      item.setCategory('Type', updates.type);
    }

    // Remove explicit Ambiguous flag once resolved
    item.setCategory('Ambiguous', null);
  }

  /**
   * President's Planner Perpetual Tracking:
   * Roll forward all overdue, incomplete items to a target date (defaults to Today).
   * Appends an audit trail entry into the item's attached note.
   * @param {Array<Item>} items
   * @param {string} [targetDate] - ISO YYYY-MM-DD (defaults to Today)
   * @param {Date} [referenceDate] - Baseline date
   * @returns {{ count: number, rolledItems: Array<{ id: string, oldDate: string, newDate: string }> }}
   */
  static rolloverOverdueItems(items = [], targetDate = null, referenceDate = new Date()) {
    const todayStr = targetDate || formatLocalDate(referenceDate);
    const rolledItems = [];

    items.forEach(item => {
      if (item.done) return;
      const when = item.getCategory('When');
      if (!when) return;

      const datePart = String(when).split('T')[0];
      if (datePart < todayStr) {
        const oldDate = datePart;
        item.setCategory('When', todayStr);

        // Append audit note
        const auditLine = `\n\n> ⚡ [Rollover] Rescheduled from ${oldDate} to ${todayStr} (${formatLocalDate(referenceDate)} rollover)`;
        item.note = (item.note || '') + auditLine;

        rolledItems.push({
          id: item.id,
          text: item.text,
          oldDate,
          newDate: todayStr
        });
      }
    });

    return {
      count: rolledItems.length,
      rolledItems
    };
  }

  /**
   * President's Planner Delegation & Follow-Up Tracker:
   * Returns all items currently delegated or waiting on someone.
   * @param {Array<Item>} items
   * @returns {Array<Item>}
   */
  static getDelegatedItems(items = []) {
    return items.filter(item => {
      const status = item.getCategory('Status');
      const delegatedTo = item.getCategory('DelegatedTo');
      const type = item.getCategory('Type');
      return status === 'Delegated' || status === 'Waiting' || delegatedTo !== null || type === 'Follow-up';
    });
  }

  /**
   * Delegate an item to a person with follow-up tracking
   * @param {Item} item
   * @param {string} personName
   * @param {string} [dueDate]
   * @param {string} [milestoneNote]
   */
  static delegateItem(item, personName, dueDate = null, milestoneNote = '') {
    if (!item || !personName) return;

    item.setCategory('DelegatedTo', personName);
    item.setCategory('Status', 'Delegated');
    item.addCategoryValue('People', personName);

    if (dueDate) {
      item.setCategory('When', dueDate);
      item.setCategory('FollowUpDate', dueDate);
    }

    if (milestoneNote) {
      item.note = (item.note || '') + `\n\n### 📌 Delegation Record\n- **Delegated To:** ${personName}\n- **Check-in Date:** ${dueDate || 'Open'}\n- **Note:** ${milestoneNote}`;
    }
  }

  /**
   * President's Planner "Scratch Pad" DWIM Classifier:
   * Parses unstructured, random notes typed into the top Scratch Pad bar
   * and infers optimal categories, assignment type, and action headings.
   * @param {string} rawText
   * @param {Object} nlpEngine
   * @param {Date} [referenceDate]
   * @returns {Item}
   */
  static classifyScratchPadText(rawText, nlpEngine, referenceDate = new Date()) {
    if (!rawText || !rawText.trim()) return null;

    const parsed = nlpEngine ? nlpEngine.parse(rawText, referenceDate) : { categoryAssignments: {}, people: [] };
    const lower = rawText.toLowerCase();

    const categories = { ...parsed.categoryAssignments };
    let note = '';

    // 1. Detect Expenses & Purchases (explicit dollar cost or purchase keywords)
    if (parsed.cost !== null || /\b(?:paid|bought|purchase|invoice|receipt|reimbursement|expense|\$)\b/i.test(lower)) {
      categories['Type'] = 'Expense';
    }
    // 2. Detect Delegated Promises / Follow-ups
    else if (/\b(?:delegat(?:e|ed)|promised|waiting\s+for|ask\s+.*to|follow\s*up)\b/i.test(lower)) {
      categories['Type'] = 'Follow-up';
      categories['Status'] = 'Delegated';

      let assignedPerson = parsed.people && parsed.people.length > 0 ? parsed.people[0] : null;
      if (!assignedPerson) {
        const promiseMatch = rawText.match(/\b([A-Za-z]+)\s+promised\b/i) ||
                             rawText.match(/\bpromised\s+by\s+([A-Za-z]+)\b/i) ||
                             rawText.match(/\bdelegat(?:e|ed)\s+to\s+([A-Za-z]+)\b/i) ||
                             rawText.match(/\bwaiting\s+for\s+([A-Za-z]+)\b/i);
        if (promiseMatch) {
          assignedPerson = promiseMatch[1].charAt(0).toUpperCase() + promiseMatch[1].slice(1).toLowerCase();
        }
      }

      if (assignedPerson) {
        categories['DelegatedTo'] = assignedPerson;
        if (!categories['People']) categories['People'] = [assignedPerson];
        else if (!categories['People'].includes(assignedPerson)) categories['People'].push(assignedPerson);
      }
    }
    // 3. Detect Phone Conversations / Calls
    else if (/\b(?:call|phone|ring|dial|voicemail|talk\s+to|spoke\s+with)\b/i.test(lower)) {
      categories['Type'] = 'Call';
    }
    // 4. Detect Appointments & Meetings
    else if (/\b(?:meet(?:ing)?|sync|lunch|dinner|appointment|standup|coffee\s+with|interview)\b/i.test(lower)) {
      categories['Type'] = 'Meeting';
    } else {
      categories['Type'] = 'Task';
    }

    // Default Status
    if (!categories['Status']) {
      categories['Status'] = 'Pending';
    }

    // Default Priority if unspecified
    if (!categories['Priority']) {
      categories['Priority'] = 'Medium';
    }

    // Create item
    const item = new Item({
      text: rawText.trim(),
      note,
      categories,
      cost: parsed.cost
    });

    return item;
  }

  /**
   * Bulk assign category value across multiple items
   * @param {Array<Item>} items
   * @param {string} categoryName
   * @param {*} categoryValue
   * @returns {number} count of modified items
   */
  static bulkAssignCategory(items = [], categoryName, categoryValue) {
    let count = 0;
    items.forEach(item => {
      item.setCategory(categoryName, categoryValue);
      count++;
    });
    return count;
  }

  /**
   * Archive all completed items (Status: Archived)
   * @param {Array<Item>} items
   * @returns {number} count of archived items
   */
  static archiveCompletedItems(items = []) {
    let count = 0;
    items.forEach(item => {
      if (item.done && item.getCategory('Status') !== 'Archived') {
        item.setCategory('Status', 'Archived');
        count++;
      }
    });
    return count;
  }

  /**
   * Permanently purge completed items
   * @param {Array<Item>} items
   * @returns {Array<Item>} Remaining items
   */
  static purgeCompletedItems(items = []) {
    return items.filter(item => !item.done);
  }
}
