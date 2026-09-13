/**
 * View.js - Lotus Agenda Views / Dashboards.
 * Configures section groupings, display columns, filters, and display styles.
 */

export class View {
  constructor({
    id = null,
    name = '',
    description = '',
    type = 'sections', // 'sections', 'table', 'datebook', 'matrix', 'expense'
    sectionCategory = 'When', // Category name to group sections by (e.g. 'When', 'Project', 'Status')
    columns = ['When', 'Priority', 'Project', 'People', 'Status'],
    filterExpression = '', // e.g. "[-Done, When(<- > A week from today)]"
    sortCategory = 'When',
    sortDirection = 'asc',
    matrixRowCategory = 'Project',
    matrixColCategory = 'Status',
    isBuiltin = false
  } = {}) {
    this.id = id || 'view_' + Math.random().toString(36).substr(2, 9);
    this.name = name.trim();
    this.description = description;
    this.type = type;
    this.sectionCategory = sectionCategory;
    this.columns = [...columns];
    this.filterExpression = filterExpression;
    this.sortCategory = sortCategory;
    this.sortDirection = sortDirection;
    this.matrixRowCategory = matrixRowCategory;
    this.matrixColCategory = matrixColCategory;
    this.isBuiltin = Boolean(isBuiltin);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      sectionCategory: this.sectionCategory,
      columns: this.columns,
      filterExpression: this.filterExpression,
      sortCategory: this.sortCategory,
      sortDirection: this.sortDirection,
      matrixRowCategory: this.matrixRowCategory,
      matrixColCategory: this.matrixColCategory,
      isBuiltin: this.isBuiltin
    };
  }

  static fromJSON(json) {
    return new View(json);
  }
}
