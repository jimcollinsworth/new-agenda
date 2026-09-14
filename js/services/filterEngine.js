/**
 * filterEngine.js - Evaluates Lotus Agenda filter expressions & nvALT search queries.
 *
 * Supports Agenda's classic expression syntax:
 *   [-Done, When(<- > A week from today)]
 *   [-Done, When(<- A week from today)]
 *   [-Done, -When]
 *   [Done(2 days ago <->)]
 *   [Done(Today)]
 *   [+Priority:High, -Status:Archived]
 *   [When(Overdue)]
 *   [When(Today)]
 *   [When(This Week)]
 *
 * And nvALT free-text multi-term incremental search (including quotes, tags, mentions, projects).
 */

import { NLPEngine } from './nlpEngine.js';
import { formatLocalDate, addDays } from '../utils/dateUtils.js';

export class FilterEngine {
  constructor() {
    this.nlpEngine = new NLPEngine();
  }

  /**
   * Filter an array of items based on filter expression and search query
   */
  filterItems(items, filterExpr = '', searchQuery = '', refDate = new Date()) {
    if (!Array.isArray(items)) return [];

    let filtered = items;

    // 1. Evaluate Agenda filter expression if present
    if (filterExpr && filterExpr.trim()) {
      const conditions = this.parseFilterExpression(filterExpr.trim(), refDate);
      filtered = filtered.filter(item => this.matchesConditions(item, conditions, refDate));
    }

    // 2. Evaluate nvALT search query if present
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      // Tokenize supporting quoted phrases: e.g. 'deploy "Death Star" #urgent'
      const terms = (query.match(/"[^"]+"|\S+/g) || []).map(t => t.replace(/^"|"$/g, '').toLowerCase());

      filtered = filtered.filter(item => {
        const itemText = (item.text || '').toLowerCase();
        const noteText = (item.note || '').toLowerCase();
        const categoriesStr = Object.entries(item.categories || {})
          .map(([k, v]) => `${k}:${Array.isArray(v) ? v.join(' ') : v}`)
          .join(' ')
          .toLowerCase();

        const fullContent = `${itemText} ${noteText} ${categoriesStr}`;

        // Every term must be found in the item content (nvALT style multi-term search)
        return terms.every(term => {
          if (term.startsWith('#')) {
            const tag = term.substring(1).toLowerCase();
            const tags = item.getCategory('Tags');
            if (Array.isArray(tags)) return tags.some(t => String(t).toLowerCase() === tag);
            if (typeof tags === 'string') return tags.toLowerCase() === tag;
            return false;
          }
          if (term.startsWith('@')) {
            const person = term.substring(1).toLowerCase();
            const people = item.getCategory('People');
            if (Array.isArray(people)) return people.some(p => String(p).toLowerCase().includes(person));
            if (typeof people === 'string') return people.toLowerCase().includes(person);
            return false;
          }
          if (term.startsWith('+')) {
            const proj = term.substring(1).toLowerCase();
            const project = item.getCategory('Project');
            if (Array.isArray(project)) return project.some(p => String(p).toLowerCase().includes(proj));
            if (typeof project === 'string') return project.toLowerCase().includes(proj);
            return false;
          }
          return fullContent.includes(term);
        });
      });
    }

    return filtered;
  }

  /**
   * Parses an Agenda filter expression into AST conditions
   * Example: "[-Done, When(<- > A week from today)]"
   */
  parseFilterExpression(expr, refDate = new Date()) {
    let clean = expr.trim();
    if (clean.startsWith('[') && clean.endsWith(']')) {
      clean = clean.substring(1, clean.length - 1).trim();
    }
    if (!clean) return [];

    // Split by comma outside parentheses
    const tokens = [];
    let current = '';
    let inParen = 0;

    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (ch === '(') inParen++;
      else if (ch === ')') inParen = Math.max(0, inParen - 1);

      if (ch === ',' && inParen === 0) {
        if (current.trim()) tokens.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) tokens.push(current.trim());

    return tokens.map(token => this.parseSingleCondition(token, refDate)).filter(Boolean);
  }

  /**
   * Parse a single token like "-Done", "+Done", "When(<- > A week from today)", "-When", "Done(2 days ago <->)"
   */
  parseSingleCondition(token, refDate) {
    token = token.trim();
    if (!token) return null;

    // Range syntax with arrow variations:
    // CategoryName(start <-> end), CategoryName(start <->), CategoryName(<- > end), CategoryName(<- end)
    const rangeMatch = token.match(/^([A-Za-z0-9_]+)\s*\(\s*(.*?)\s*(?:<\s*-+(?:\s+-+)*\s*>|<-\s*>|<->|<\s*->|<- ->|<-\s*->|\.\.|\bto\b)\s*(.*?)\s*\)$/i);
    if (rangeMatch) {
      const catName = rangeMatch[1];
      const startStr = rangeMatch[2].trim();
      const endStr = rangeMatch[3].trim();

      const startDateObj = startStr ? this.nlpEngine.parseNaturalDate(startStr, refDate)?.date : null;
      const endDateObj = endStr ? this.nlpEngine.parseNaturalDate(endStr, refDate)?.date : null;

      return {
        type: 'date_range',
        category: catName,
        startDate: startDateObj ? formatLocalDate(startDateObj) : null,
        endDate: endDateObj ? formatLocalDate(endDateObj) : null
      };
    }

    // Leading arrow syntax: Cat(<- date), Cat(< date), Cat(<= date), Cat(-> date), Cat(.. date) -> up to date
    const beforeArrowMatch = token.match(/^([A-Za-z0-9_]+)\s*\(\s*(?:<\s*-*|<=|->|- >|\.\.)\s*(.*?)\s*\)$/);
    if (beforeArrowMatch) {
      const catName = beforeArrowMatch[1];
      const endStr = beforeArrowMatch[2].trim();
      const endDateObj = endStr ? this.nlpEngine.parseNaturalDate(endStr, refDate)?.date : null;
      return {
        type: 'date_range',
        category: catName,
        startDate: null,
        endDate: endDateObj ? formatLocalDate(endDateObj) : null
      };
    }

    // Trailing arrow syntax: Cat(date ->), Cat(date >), Cat(date >=), Cat(date <->) -> from date onwards
    const afterArrowMatch = token.match(/^([A-Za-z0-9_]+)\s*\(\s*(.*?)\s*(?:-*\s*>|>=|\.\.)\s*\)$/);
    if (afterArrowMatch) {
      const catName = afterArrowMatch[1];
      const startStr = afterArrowMatch[2].trim();
      const startDateObj = startStr ? this.nlpEngine.parseNaturalDate(startStr, refDate)?.date : null;
      return {
        type: 'date_range',
        category: catName,
        startDate: startDateObj ? formatLocalDate(startDateObj) : null,
        endDate: null
      };
    }

    // Leading greater-than / after date: Cat(> date), Cat(>= date) -> from date onwards
    const greaterThanMatch = token.match(/^([A-Za-z0-9_]+)\s*\(\s*(?:>|>=)\s*(.*?)\s*\)$/);
    if (greaterThanMatch) {
      const catName = greaterThanMatch[1];
      const startStr = greaterThanMatch[2].trim();
      const startDateObj = startStr ? this.nlpEngine.parseNaturalDate(startStr, refDate)?.date : null;
      return {
        type: 'date_range',
        category: catName,
        startDate: startDateObj ? formatLocalDate(startDateObj) : null,
        endDate: null
      };
    }

    // Special helper functions & natural dates & category values:
    // When(Today), When(Overdue), When(This Week), When(Tomorrow), When(Yesterday), Priority(High)
    const helperMatch = token.match(/^([A-Za-z0-9_]+)\s*\(\s*([^()]+)\s*\)$/);
    if (helperMatch) {
      const catName = helperMatch[1];
      const paramRaw = helperMatch[2].trim();
      const param = paramRaw.toLowerCase();
      const todayStr = formatLocalDate(refDate);

      if (param === 'today') {
        return { type: 'exact_date', category: catName, date: todayStr };
      }
      if (param === 'overdue') {
        return { type: 'date_before', category: catName, date: todayStr };
      }
      if (param === 'tomorrow') {
        return { type: 'exact_date', category: catName, date: formatLocalDate(addDays(refDate, 1)) };
      }
      if (param === 'yesterday') {
        return { type: 'exact_date', category: catName, date: formatLocalDate(addDays(refDate, -1)) };
      }
      if (param === 'this week') {
        return { type: 'date_range', category: catName, startDate: todayStr, endDate: formatLocalDate(addDays(refDate, 7)) };
      }
      if (param === 'next week') {
        return { type: 'date_range', category: catName, startDate: formatLocalDate(addDays(refDate, 7)), endDate: formatLocalDate(addDays(refDate, 14)) };
      }
      if (param === 'this month') {
        const endOfMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 12, 0, 0);
        return { type: 'date_range', category: catName, startDate: todayStr, endDate: formatLocalDate(endOfMonth) };
      }

      // If helper parameter can be parsed as a natural date: e.g. When(2026-09-18) or When(Friday)
      const parsedDate = this.nlpEngine.parseNaturalDate(paramRaw, refDate)?.date;
      if (parsedDate) {
        return { type: 'exact_date', category: catName, date: formatLocalDate(parsedDate) };
      }

      // Fallback for general Category(Value) syntax e.g. Priority(Urgent), Project(Death Star)
      return { type: 'category_equal', category: catName, value: paramRaw };
    }

    // Absence check: "-Category" e.g. "-When", "-Done"
    if (token.startsWith('-')) {
      const target = token.substring(1).trim();
      if (target.toLowerCase() === 'done') {
        return { type: 'done_state', value: false };
      }
      if (target.includes(':')) {
        const [cat, val] = target.split(':');
        return { type: 'category_not_equal', category: cat.trim(), value: val.trim() };
      }
      return { type: 'category_empty', category: target };
    }

    // Presence check: "+Category" e.g. "+Done", "+When", "+Priority:High"
    if (token.startsWith('+')) {
      const target = token.substring(1).trim();
      if (target.toLowerCase() === 'done') {
        return { type: 'done_state', value: true };
      }
      if (target.includes(':')) {
        const [cat, val] = target.split(':');
        return { type: 'category_equal', category: cat.trim(), value: val.trim() };
      }
      return { type: 'category_present', category: target };
    }

    // Direct "Done" or "Pending"
    if (token.toLowerCase() === 'done') {
      return { type: 'done_state', value: true };
    }
    if (token.toLowerCase() === 'pending') {
      return { type: 'done_state', value: false };
    }

    // Simple "Category:Value"
    if (token.includes(':')) {
      const [cat, val] = token.split(':');
      return { type: 'category_equal', category: cat.trim(), value: val.trim() };
    }

    return null;
  }

  /**
   * Evaluates if an item matches all AST conditions (AND conjunction)
   */
  matchesConditions(item, conditions, refDate) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(cond => {
      switch (cond.type) {
        case 'done_state':
          return item.done === cond.value;

        case 'category_empty': {
          if (cond.category.toLowerCase() === 'done') {
            return !item.done;
          }
          const val = item.getCategory(cond.category);
          return val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
        }

        case 'category_present': {
          if (cond.category.toLowerCase() === 'done') {
            return item.done;
          }
          const val = item.getCategory(cond.category);
          return val !== null && val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0);
        }

        case 'category_equal': {
          const val = item.getCategory(cond.category);
          if (!val) return false;
          if (Array.isArray(val)) {
            return val.some(v => String(v).toLowerCase() === cond.value.toLowerCase());
          }
          return String(val).toLowerCase() === cond.value.toLowerCase();
        }

        case 'category_not_equal': {
          const val = item.getCategory(cond.category);
          if (!val) return true;
          if (Array.isArray(val)) {
            return !val.some(v => String(v).toLowerCase() === cond.value.toLowerCase());
          }
          return String(val).toLowerCase() !== cond.value.toLowerCase();
        }

        case 'exact_date': {
          let itemDate = null;
          if (cond.category.toLowerCase() === 'done') {
            if (!item.done) return false;
            itemDate = item.getCategory('Done') || (item.updatedAt ? formatLocalDate(new Date(item.updatedAt)) : null);
          } else {
            const val = item.getCategory(cond.category);
            if (!val) return false;
            const dateVal = Array.isArray(val) ? val[0] : val;
            itemDate = String(dateVal).split('T')[0];
          }
          return itemDate === cond.date;
        }

        case 'date_before': {
          let itemDate = null;
          if (cond.category.toLowerCase() === 'done') {
            if (!item.done) return false;
            itemDate = item.getCategory('Done') || (item.updatedAt ? formatLocalDate(new Date(item.updatedAt)) : null);
          } else {
            const val = item.getCategory(cond.category);
            if (!val) return false;
            const dateVal = Array.isArray(val) ? val[0] : val;
            itemDate = String(dateVal).split('T')[0];
          }
          return Boolean(itemDate && itemDate < cond.date);
        }

        case 'date_range': {
          let itemDate = null;
          if (cond.category.toLowerCase() === 'done') {
            if (!item.done) return false;
            itemDate = item.getCategory('Done') || (item.updatedAt ? formatLocalDate(new Date(item.updatedAt)) : null);
          } else {
            const val = item.getCategory(cond.category);
            if (!val) return false;
            const dateVal = Array.isArray(val) ? val[0] : val;
            itemDate = String(dateVal).split('T')[0];
          }

          if (!itemDate) return false;
          if (cond.startDate && itemDate < cond.startDate) return false;
          if (cond.endDate && itemDate > cond.endDate) return false;
          return true;
        }

        default:
          return true;
      }
    });
  }
}
