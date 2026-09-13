/**
 * nlpEngine.js - Natural Language Processing & Date Extraction for Agenda/nvALT
 * Parses relative dates, time intervals, recurrent frequencies, people, projects,
 * priorities, costs, and keywords from freeform item text.
 */

import { formatLocalDate, addDays } from '../utils/dateUtils.js';

export class NLPEngine {
  constructor(categoryManager = null) {
    this.categoryManager = categoryManager;
  }

  /**
   * Main entry point: parses text and returns extracted metadata + clean item text
   * @param {string} text - Raw input text from Omnibar or Item input
   * @param {Date} [referenceDate] - Current baseline date (defaults to now)
   */
  parse(text, referenceDate = new Date()) {
    if (!text || typeof text !== 'string') {
      return {
        cleanText: '',
        when: null,
        whenDisplay: null,
        recurrence: null,
        timeOfDay: null,
        priority: null,
        project: null,
        people: [],
        tags: [],
        cost: null,
        categoryAssignments: {}
      };
    }

    let raw = text.trim();
    const result = {
      cleanText: raw,
      when: null,
      whenDisplay: null,
      recurrence: null,
      timeOfDay: null,
      priority: null,
      project: null,
      people: [],
      tags: [],
      cost: null,
      categoryAssignments: {}
    };

    // 1. Extract Costs / Monetary amounts ($50, $1,250.00, 45.00 USD)
    const costMatch = raw.match(/(?:\$|USD\s*)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i) ||
                      raw.match(/(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:USD|dollars?)/i);
    if (costMatch) {
      result.cost = parseFloat(costMatch[1].replace(/,/g, ''));
      result.categoryAssignments['Cost'] = result.cost;
    }

    // 2. Extract Tags (#tag)
    const tagMatches = raw.match(/#([a-zA-Z0-9_\-]+)/g);
    if (tagMatches) {
      result.tags = tagMatches.map(t => t.substring(1));
      result.categoryAssignments['Tags'] = result.tags;
    }

    // 3. Extract @mentions (@Sarah, @Tom)
    const mentionMatches = raw.match(/@([a-zA-Z0-9_\-]+)/g);
    if (mentionMatches) {
      mentionMatches.forEach(m => {
        const name = m.substring(1);
        if (!result.people.includes(name)) result.people.push(name);
      });
    }

    // 4. Extract +projects (+DeathStar, +Website)
    const projectMatches = raw.match(/\+([a-zA-Z0-9_\-]+)/g);
    if (projectMatches) {
      result.project = projectMatches[0].substring(1).replace(/_/g, ' ');
      result.categoryAssignments['Project'] = result.project;
    }

    // 5. Extract Priority keywords (urgent, asap, high priority, low priority, !!!)
    if (/\b(?:urgent|asap|crit(?:ical)?|emergency)\b/i.test(raw) || /!{2,}/.test(raw)) {
      result.priority = 'Urgent';
      result.categoryAssignments['Priority'] = 'Urgent';
    } else if (/\b(?:high\s*priority|important)\b/i.test(raw) || /!/.test(raw)) {
      result.priority = 'High';
      result.categoryAssignments['Priority'] = 'High';
    } else if (/\b(?:med(?:ium)?\s*priority|normal)\b/i.test(raw)) {
      result.priority = 'Medium';
      result.categoryAssignments['Priority'] = 'Medium';
    } else if (/\b(?:low\s*priority|minor|someday|trivial)\b/i.test(raw)) {
      result.priority = 'Low';
      result.categoryAssignments['Priority'] = 'Low';
    }

    // 6. Time of day parsing ("at 3pm", "at 14:30", "at 9:00 am")
    const timeMatch = raw.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      result.timeOfDay = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // 7. Recurrence parsing ("every four months", "every Monday", "every day", "daily", "weekly")
    const recurrenceMatch = raw.match(/\bevery\s+(?:(\d+|two|three|four|five|six)\s+)?(day|days|weekday|weekdays|week|weeks|month|months|year|years|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if (recurrenceMatch) {
      result.recurrence = recurrenceMatch[0];
    } else if (/\b(daily|weekly|monthly|annually)\b/i.test(raw)) {
      const recMatch = raw.match(/\b(daily|weekly|monthly|annually)\b/i);
      result.recurrence = recMatch[1];
    }

    // 8. Comprehensive Date parsing (When)
    const parsedDate = this.parseNaturalDate(raw, referenceDate);
    if (parsedDate) {
      result.when = formatLocalDate(parsedDate.date);
      result.whenDisplay = parsedDate.display;
      result.categoryAssignments['When'] = result.when;
    }

    // 9. Match existing Category Values and Keywords from CategoryManager
    const catList = Array.isArray(this.categoryManager)
      ? this.categoryManager
      : (this.categoryManager && Array.isArray(this.categoryManager.categories) ? this.categoryManager.categories : []);

    if (catList.length > 0) {
      catList.forEach(cat => {
        if (cat.name === 'When' || cat.name === 'Cost') return;

        cat.values.forEach(val => {
          const valNameLower = val.name.toLowerCase();
          // Check if item contains value name as whole word or phrase
          const phraseRegex = new RegExp(`\\b${this.escapeRegExp(valNameLower)}\\b`, 'i');
          let matched = phraseRegex.test(raw);

          // Check keywords/aliases
          if (!matched && val.keywords && val.keywords.length > 0) {
            matched = val.keywords.some(kw => {
              const kwRegex = new RegExp(`\\b${this.escapeRegExp(kw)}\\b`, 'i');
              return kwRegex.test(raw);
            });
          }

          if (matched) {
            if (cat.name === 'People') {
              if (!result.people.includes(val.name)) {
                result.people.push(val.name);
              }
              result.categoryAssignments['People'] = result.people;
            } else if (cat.type === 'multi') {
              if (!result.categoryAssignments[cat.name]) result.categoryAssignments[cat.name] = [];
              if (!result.categoryAssignments[cat.name].includes(val.name)) {
                result.categoryAssignments[cat.name].push(val.name);
              }
            } else {
              result.categoryAssignments[cat.name] = val.name;
              if (cat.name === 'Project' && !result.project) result.project = val.name;
              if (cat.name === 'Priority' && !result.priority) result.priority = val.name;
            }
          }
        });
      });
    }

    // Extract natural person names from common patterns ("Call Sarah", "Email Bob", "Meet with David and Tom")
    const actionPersonMatches = raw.matchAll(/\b(?:call|phone|email|meet\s+(?:with\s+)?|ping|contact|talk\s+to|ask)\s+([A-Za-z]+)(?:\s+(?:and|&)\s+([A-Za-z]+))?\b/gi);
    for (const match of actionPersonMatches) {
      [match[1], match[2]].filter(Boolean).forEach(rawName => {
        const personName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
        const stopWords = ['Today', 'Tomorrow', 'Yesterday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'The', 'A', 'An', 'Him', 'Her', 'Them', 'About', 'Regarding', 'For', 'With', 'To'];
        if (!stopWords.includes(personName) && !result.people.includes(personName)) {
          result.people.push(personName);
          result.categoryAssignments['People'] = result.people;
        }
      });
    }

    return result;
  }

  /**
   * Parses natural language date phrases into a Date object
   */
  parseNaturalDate(text, refDate = new Date()) {
    const base = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 12, 0, 0);
    const lower = text.toLowerCase();

    // 1. Specific multi-word relative anchors:
    // "day before yesterday"
    if (/\bday before yesterday\b/i.test(lower)) {
      return { date: addDays(base, -2), display: '2 days ago' };
    }

    // "day after tomorrow"
    if (/\bday after tomorrow\b/i.test(lower)) {
      return { date: addDays(base, 2), display: 'In 2 days' };
    }

    const WORD_NUMBERS = {
      a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
    };
    const parseCount = (str) => {
      const s = String(str || '').toLowerCase().trim();
      if (WORD_NUMBERS[s] !== undefined) return WORD_NUMBERS[s];
      const n = parseInt(s, 10);
      return isNaN(n) ? 1 : n;
    };

    // 2. Relative offsets from anchor ("a week from today", "2 weeks from now", "3 days from tomorrow", etc.)
    const fromOffsetMatch = lower.match(/\b(?:(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(day|days|week|weeks|month|months|year|years)\s+from\s+(today|now|tomorrow|yesterday))\b/i);
    if (fromOffsetMatch) {
      const count = parseCount(fromOffsetMatch[1]);
      const unit = fromOffsetMatch[2].toLowerCase();
      const anchor = fromOffsetMatch[3].toLowerCase();
      let anchorDate = base;
      if (anchor === 'tomorrow') anchorDate = addDays(base, 1);
      else if (anchor === 'yesterday') anchorDate = addDays(base, -1);

      if (unit.startsWith('day')) {
        return { date: addDays(anchorDate, count), display: count === 1 ? 'Tomorrow' : `In ${count} days` };
      }
      if (unit.startsWith('week')) {
        return { date: addDays(anchorDate, count * 7), display: count === 1 ? 'In 1 week' : `In ${count} weeks` };
      }
      if (unit.startsWith('month')) {
        const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + count, anchorDate.getDate(), 12, 0, 0);
        return { date: d, display: count === 1 ? 'In 1 month' : `In ${count} months` };
      }
      if (unit.startsWith('year')) {
        const d = new Date(anchorDate.getFullYear() + count, anchorDate.getMonth(), anchorDate.getDate(), 12, 0, 0);
        return { date: d, display: count === 1 ? 'In 1 year' : `In ${count} years` };
      }
    }

    // "a week from today" / "1 week from now" (fallback check)
    if (/\b(?:a\s+week|1\s+week)\s+from\s+(?:today|now)\b/i.test(lower)) {
      return { date: addDays(base, 7), display: 'In 1 week' };
    }

    // 3. "in N days" / "in N weeks" / "in N months" / "in a week", etc.
    const inMatch = lower.match(/\bin\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(day|days|week|weeks|month|months|year|years)\b/i);
    if (inMatch) {
      const count = parseCount(inMatch[1]);
      const unit = inMatch[2].toLowerCase();
      if (unit.startsWith('day')) {
        return { date: addDays(base, count), display: count === 1 ? 'Tomorrow' : `In ${count} days` };
      }
      if (unit.startsWith('week')) {
        return { date: addDays(base, count * 7), display: count === 1 ? 'In 1 week' : `In ${count} weeks` };
      }
      if (unit.startsWith('month')) {
        const d = new Date(base.getFullYear(), base.getMonth() + count, base.getDate(), 12, 0, 0);
        return { date: d, display: count === 1 ? 'In 1 month' : `In ${count} months` };
      }
      if (unit.startsWith('year')) {
        const d = new Date(base.getFullYear() + count, base.getMonth(), base.getDate(), 12, 0, 0);
        return { date: d, display: count === 1 ? 'In 1 year' : `In ${count} years` };
      }
    }

    // 4. "N days ago" / "N weeks ago" / "N months ago" / "a week ago", etc.
    const agoMatch = lower.match(/\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(day|days|week|weeks|month|months|year|years)\s+ago\b/i);
    if (agoMatch) {
      const count = parseCount(agoMatch[1]);
      const unit = agoMatch[2].toLowerCase();
      if (unit.startsWith('day')) {
        return { date: addDays(base, -count), display: count === 1 ? 'Yesterday' : `${count} days ago` };
      }
      if (unit.startsWith('week')) {
        return { date: addDays(base, -count * 7), display: count === 1 ? '1 week ago' : `${count} weeks ago` };
      }
      if (unit.startsWith('month')) {
        const d = new Date(base.getFullYear(), base.getMonth() - count, base.getDate(), 12, 0, 0);
        return { date: d, display: count === 1 ? '1 month ago' : `${count} months ago` };
      }
      if (unit.startsWith('year')) {
        const d = new Date(base.getFullYear() - count, base.getMonth(), base.getDate(), 12, 0, 0);
        return { date: d, display: count === 1 ? '1 year ago' : `${count} years ago` };
      }
    }

    // 5. Special relative markers
    // "this weekend" / "weekend"
    if (/\b(?:this\s+)?weekend\b/i.test(lower)) {
      const curDay = base.getDay();
      let diff = 6 - curDay; // Saturday
      if (diff < 0) diff += 7;
      return { date: addDays(base, diff), display: 'This weekend' };
    }

    // "end of (the )?week" -> Friday of current week
    if (/\bend\s+of\s+(?:the\s+)?week\b/i.test(lower)) {
      const curDay = base.getDay();
      let diff = 5 - curDay;
      if (diff <= 0) diff += 7;
      return { date: addDays(base, diff), display: 'End of week' };
    }

    // "end of (the )?month" -> Last day of current month
    if (/\bend\s+of\s+(?:the\s+)?month\b/i.test(lower)) {
      const d = new Date(base.getFullYear(), base.getMonth() + 1, 0, 12, 0, 0);
      return { date: d, display: 'End of month' };
    }

    // "next week" -> +7 days
    if (/\bnext\s+week\b/i.test(lower)) {
      return { date: addDays(base, 7), display: 'Next week' };
    }

    // "next month" -> +1 month
    if (/\bnext\s+month\b/i.test(lower)) {
      const d = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate(), 12, 0, 0);
      return { date: d, display: 'Next month' };
    }

    // Weekday match: "this Friday", "next Tuesday", "coming Monday", "on Friday", "Friday"
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekdayRegex = /\b(?:(this|next|coming|last|on)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
    const weekdayMatch = lower.match(weekdayRegex);

    if (weekdayMatch) {
      const modifier = (weekdayMatch[1] || '').toLowerCase();
      const targetDayName = weekdayMatch[2].toLowerCase();
      const targetDay = weekdays.indexOf(targetDayName);
      const currentDay = base.getDay();

      let diff = targetDay - currentDay;

      if (modifier === 'last') {
        if (diff >= 0) diff -= 7;
      } else if (modifier === 'next') {
        if (diff <= 0) diff += 7;
        else diff += 7;
      } else if (modifier === 'this') {
        // "this Friday" when today is Fri is today (diff = 0)
        // "this Friday" when today is Tue is +3 days
        // "this Friday" when today is Sat is next Friday (+6 days)
        if (diff < 0) diff += 7;
      } else {
        // "on Friday" or just "Friday"
        if (diff <= 0) diff += 7; // Upcoming occurrence
      }

      const d = addDays(base, diff);
      const capName = targetDayName.charAt(0).toUpperCase() + targetDayName.slice(1);
      return { date: d, display: modifier ? `${modifier} ${capName}` : capName };
    }

    // 6. Simple single-word relative dates (checked after compound phrases to avoid shadowing)
    // "tomorrow"
    if (/\btomorrow\b/i.test(lower)) {
      return { date: addDays(base, 1), display: 'Tomorrow' };
    }

    // "yesterday"
    if (/\byesterday\b/i.test(lower)) {
      return { date: addDays(base, -1), display: 'Yesterday' };
    }

    // "today"
    if (/\btoday\b/i.test(lower)) {
      return { date: base, display: 'Today' };
    }

    // ISO Date: 2026-09-25
    const isoMatch = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) {
      const d = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10), 12, 0, 0);
      if (!isNaN(d.getTime())) {
        return { date: d, display: isoMatch[0] };
      }
    }

    // Month & Day: "Nov 15", "November 15", "March 3rd", "Oct 1st 2026", "Sept 15"
    const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthRegex = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b/i;
    const monthMatch = lower.match(monthRegex);

    if (monthMatch) {
      const monthStr = monthMatch[1].toLowerCase();
      let monthIndex = shortMonths.indexOf(monthStr.substring(0, 3));
      const day = parseInt(monthMatch[2], 10);
      const year = monthMatch[3] ? parseInt(monthMatch[3], 10) : base.getFullYear();

      const d = new Date(year, monthIndex, day, 12, 0, 0);
      if (!isNaN(d.getTime())) {
        return { date: d, display: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: monthMatch[3] ? 'numeric' : undefined }) };
      }
    }

    // Standard US/EU date: MM/DD/YYYY or MM/DD
    const slashMatch = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1], 10) - 1;
      const day = parseInt(slashMatch[2], 10);
      let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : base.getFullYear();
      if (year < 100) year += 2000;
      const d = new Date(year, month, day, 12, 0, 0);
      if (!isNaN(d.getTime())) {
        return { date: d, display: `${month + 1}/${day}/${year}` };
      }
    }

    return null;
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
