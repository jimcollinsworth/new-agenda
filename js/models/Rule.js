/**
 * Rule.js - Lotus Agenda Assignment Rules.
 * Evaluates conditions on items and applies automatic category assignments.
 */

export class Rule {
  constructor({
    id = null,
    name = '',
    enabled = true,
    conditionType = 'text_contains', // 'text_contains', 'text_regex', 'category_is', 'date_is'
    conditionParam = '', // search word or category name
    conditionValue = '', // search pattern or category target value
    targetCategory = '', // category to assign
    targetValue = '', // value to assign
    priority = 10
  } = {}) {
    this.id = id || 'rule_' + Math.random().toString(36).substr(2, 9);
    this.name = name || `Assign ${targetCategory}: ${targetValue}`;
    this.enabled = Boolean(enabled);
    this.conditionType = conditionType;
    this.conditionParam = conditionParam;
    this.conditionValue = conditionValue;
    this.targetCategory = targetCategory;
    this.targetValue = targetValue;
    this.priority = priority;
  }

  /**
   * Test if an item matches this rule condition
   */
  matches(item) {
    if (!this.enabled) return false;

    switch (this.conditionType) {
      case 'text_contains': {
        const needle = (this.conditionValue || this.conditionParam || '').toLowerCase();
        if (!needle) return false;
        return (item.text && item.text.toLowerCase().includes(needle)) ||
               (item.note && item.note.toLowerCase().includes(needle));
      }

      case 'text_regex': {
        try {
          const pattern = new RegExp(this.conditionValue || this.conditionParam, 'i');
          return pattern.test(item.text) || pattern.test(item.note);
        } catch (e) {
          return false;
        }
      }

      case 'category_is': {
        const catName = this.conditionParam;
        const targetVal = this.conditionValue.toLowerCase();
        const currentVal = item.getCategory(catName);
        if (!currentVal) return false;
        if (Array.isArray(currentVal)) {
          return currentVal.some(v => String(v).toLowerCase() === targetVal);
        }
        return String(currentVal).toLowerCase() === targetVal;
      }

      default:
        return false;
    }
  }

  /**
   * Apply this rule's action to an item
   * Returns true if item was modified
   */
  apply(item, categoryManager = null) {
    if (!this.matches(item)) return false;
    if (!this.targetCategory || !this.targetValue) return false;

    const current = item.getCategory(this.targetCategory);
    if (Array.isArray(current)) {
      if (!current.includes(this.targetValue)) {
        item.addCategoryValue(this.targetCategory, this.targetValue);
        return true;
      }
    } else {
      if (current !== this.targetValue) {
        item.setCategory(this.targetCategory, this.targetValue);
        return true;
      }
    }
    return false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      enabled: this.enabled,
      conditionType: this.conditionType,
      conditionParam: this.conditionParam,
      conditionValue: this.conditionValue,
      targetCategory: this.targetCategory,
      targetValue: this.targetValue,
      priority: this.priority
    };
  }

  static fromJSON(json) {
    return new Rule(json);
  }
}
