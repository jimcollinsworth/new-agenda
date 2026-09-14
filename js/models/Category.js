/**
 * Category.js - Models Agenda's multi-dimensional categorization system.
 * Categories act as facets/dimensions (When, Project, People, Priority, Status, etc.)
 */

export class CategoryValue {
  constructor({
    id = null,
    name = '',
    keywords = [],
    color = null,
    parentId = null
  } = {}) {
    this.id = id || 'val_' + Math.random().toString(36).substr(2, 9);
    this.name = name.trim();
    this.keywords = Array.isArray(keywords) ? keywords.map(k => k.trim().toLowerCase()) : [];
    this.color = color || null;
    this.parentId = parentId || null;
  }
}

export class Category {
  constructor({
    id = null,
    name = '',
    type = 'text', // 'text', 'date', 'numeric', 'multi'
    values = [],
    color = '#6366f1',
    isSystem = false,
    prompt = '',
    exclusive = true
  } = {}) {
    this.id = id || 'cat_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    this.name = name.trim();
    this.type = type; // 'text', 'date', 'numeric', 'multi'
    this.color = color;
    this.isSystem = Boolean(isSystem);
    this.prompt = prompt || `Assign ${name}`;
    this.exclusive = Boolean(exclusive); // If true, only one value per item (except type='multi')
    this.values = values.map(v => v instanceof CategoryValue ? v : new CategoryValue(v));
  }

  addValue(valObj) {
    const val = valObj instanceof CategoryValue ? valObj : new CategoryValue(valObj);
    const existing = this.values.find(v => v.name.toLowerCase() === val.name.toLowerCase());
    if (!existing) {
      this.values.push(val);
      return val;
    }
    return existing;
  }

  removeValue(valIdOrName) {
    this.values = this.values.filter(v => v.id !== valIdOrName && v.name.toLowerCase() !== valIdOrName.toLowerCase());
  }

  findValueByName(name) {
    if (!name) return null;
    const lower = name.toLowerCase().trim();
    return this.values.find(v => v.name.toLowerCase() === lower || v.keywords.includes(lower));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      color: this.color,
      isSystem: this.isSystem,
      prompt: this.prompt,
      exclusive: this.exclusive,
      values: this.values.map(v => ({
        id: v.id,
        name: v.name,
        keywords: v.keywords,
        color: v.color,
        parentId: v.parentId
      }))
    };
  }

  static fromJSON(json) {
    return new Category(json);
  }
}
