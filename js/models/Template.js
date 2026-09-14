/**
 * Template.js - Template Models for AgendaVault
 * Supports full workspace/database templates (e.g. President's Planner, GTD, Projects)
 * and Item/Note boilerplate expansion templates (e.g. Meeting Note, Delegated Follow-up).
 */

export class WorkspaceTemplate {
  constructor({
    id,
    name,
    description,
    badge = 'Template',
    categories = [],
    rules = [],
    views = [],
    starterItems = []
  } = {}) {
    this.id = id || 'tpl_' + Math.random().toString(36).substr(2, 9);
    this.name = name;
    this.description = description;
    this.badge = badge;
    this.categories = categories; // Array of Category definitions
    this.rules = rules;           // Array of Rule definitions
    this.views = views;           // Array of View definitions
    this.starterItems = starterItems; // Array of starter Item definitions
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      badge: this.badge,
      categories: this.categories.map(c => typeof c.toJSON === 'function' ? c.toJSON() : c),
      rules: this.rules.map(r => typeof r.toJSON === 'function' ? r.toJSON() : r),
      views: this.views.map(v => typeof v.toJSON === 'function' ? v.toJSON() : v),
      starterItems: this.starterItems.map(i => typeof i.toJSON === 'function' ? i.toJSON() : i)
    };
  }

  static fromJSON(json) {
    return new WorkspaceTemplate(json);
  }
}

export class ItemTemplate {
  constructor({
    id,
    name,
    description,
    categoryName = 'Type',
    defaultCategoryValue = 'Task',
    categories = {},
    headlinePattern = '{{title}}',
    bodyPattern = '',
    variables = ['title']
  } = {}) {
    this.id = id || 'item_tpl_' + Math.random().toString(36).substr(2, 9);
    this.name = name;
    this.description = description;
    this.categoryName = categoryName;
    this.defaultCategoryValue = defaultCategoryValue;
    this.categories = { ...categories };
    this.headlinePattern = headlinePattern;
    this.bodyPattern = bodyPattern;
    this.variables = [...variables];
  }

  /**
   * Expands template patterns by substituting variable values
   * @param {Object} values - Map of variable name -> string value
   * @returns {{ text: string, note: string, categories: Object, cost: number|null }}
   */
  expand(values = {}) {
    let text = this.headlinePattern;
    let note = this.bodyPattern;

    const merged = { ...values };

    // Default variable fallbacks
    if (!merged.date) merged.date = new Date().toISOString().split('T')[0];
    if (!merged.title) merged.title = 'Untitled Note';
    if (!merged.person) merged.person = 'Unassigned';
    if (!merged.project) merged.project = 'General';
    if (!merged.cost) merged.cost = '0';

    // Substitute {{variable}} placeholders
    for (const [key, val] of Object.entries(merged)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      text = text.replace(regex, String(val));
      note = note.replace(regex, String(val));
    }

    const categories = { ...this.categories };
    if (this.categoryName && this.defaultCategoryValue) {
      categories[this.categoryName] = this.defaultCategoryValue;
    }
    if (merged.date && !categories['When']) {
      categories['When'] = merged.date;
    }
    if (merged.project && !categories['Project']) {
      categories['Project'] = merged.project;
    }
    if (merged.person && !categories['People']) {
      categories['People'] = [merged.person];
    }

    let cost = null;
    if (merged.cost && !isNaN(Number(merged.cost))) {
      cost = Number(merged.cost);
      categories['Cost'] = cost;
    }

    return {
      text: text.trim(),
      note: note.trim(),
      categories,
      cost
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      categoryName: this.categoryName,
      defaultCategoryValue: this.defaultCategoryValue,
      categories: this.categories,
      headlinePattern: this.headlinePattern,
      bodyPattern: this.bodyPattern,
      variables: this.variables
    };
  }

  static fromJSON(json) {
    return new ItemTemplate(json);
  }
}
