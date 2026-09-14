/**
 * Item.js - Core atomic data unit of Agenda and nvALT
 * Represents an Agenda item (headline text up to ~350 chars) with attached extended Note (Markdown).
 */
import { formatLocalDate } from '../utils/dateUtils.js';

export class Item {
  constructor({
    id = null,
    text = '',
    note = '',
    categories = {}, // Map of categoryId/name -> array of value strings or single string
    done = false,
    createdAt = null,
    updatedAt = null,
    cost = null
  } = {}) {
    this.id = id || 'item_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    this.text = text.trim();
    this.note = note || '';
    this.categories = { ...categories }; // e.g. { "When": "2026-09-18", "Priority": "High", "Project": "Death Star", "People": ["Sarah"] }
    this.done = Boolean(done);
    this.cost = cost !== null && cost !== undefined && !isNaN(Number(cost)) ? Number(cost) : null;
    this.createdAt = createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();
    this.updatedAt = updatedAt ? new Date(updatedAt).toISOString() : this.createdAt;

    if (this.done && !this.categories['Done']) {
      this.categories['Done'] = formatLocalDate(new Date(this.updatedAt || this.createdAt));
    }
  }

  /**
   * Set or update a category value
   */
  setCategory(categoryName, value) {
    if (!value && value !== 0) {
      delete this.categories[categoryName];
    } else {
      this.categories[categoryName] = value;
    }
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Get category value (or null)
   */
  getCategory(categoryName) {
    return this.categories[categoryName] !== undefined ? this.categories[categoryName] : null;
  }

  /**
   * Add a value to a multi-valued category (e.g. People, Tags)
   */
  addCategoryValue(categoryName, value) {
    const existing = this.categories[categoryName];
    if (!existing) {
      this.categories[categoryName] = [value];
    } else if (Array.isArray(existing)) {
      if (!existing.includes(value)) {
        this.categories[categoryName] = [...existing, value];
      }
    } else {
      if (existing !== value) {
        this.categories[categoryName] = [existing, value];
      }
    }
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Remove a value from a multi-valued category
   */
  removeCategoryValue(categoryName, value) {
    const existing = this.categories[categoryName];
    if (!existing) return;
    if (Array.isArray(existing)) {
      this.categories[categoryName] = existing.filter(v => v !== value);
      if (this.categories[categoryName].length === 0) {
        delete this.categories[categoryName];
      }
    } else if (existing === value) {
      delete this.categories[categoryName];
    }
    this.updatedAt = new Date().toISOString();
  }

  toggleDone() {
    this.done = !this.done;
    if (this.done) {
      this.categories['Done'] = formatLocalDate(new Date());
      this.categories['Status'] = 'Done';
    } else {
      delete this.categories['Done'];
      if (this.categories['Status'] === 'Done') {
        this.categories['Status'] = 'Pending';
      }
    }
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      text: this.text,
      note: this.note,
      categories: this.categories,
      done: this.done,
      cost: this.cost,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(json) {
    return new Item(json);
  }
}
