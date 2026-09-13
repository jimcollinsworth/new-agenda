/**
 * AgendaExpenseView.js - Lotus Agenda Expense / Numeric Calculation View.
 * Summarizes costs, fees, and expenses by project or category with subtotals and grand total.
 */

export class AgendaExpenseView {
  constructor({
    container,
    onSelectItem,
    onToggleDone
  }) {
    this.container = container;
    this.onSelectItem = onSelectItem;
    this.onToggleDone = onToggleDone;
    this.selectedItemId = null;
  }

  render(items, viewConfig) {
    this.items = items || [];
    this.viewConfig = viewConfig;

    // Filter items with costs
    const expenseItems = this.items.filter(i => i.cost !== null && i.cost !== undefined && !isNaN(i.cost));

    const totalExpense = expenseItems.reduce((acc, curr) => acc + Number(curr.cost), 0);

    // Group by Project (or chosen section category)
    const groupByCat = viewConfig.sectionCategory || 'Project';
    const groups = new Map();

    expenseItems.forEach(item => {
      const val = item.getCategory(groupByCat) || 'Unassigned';
      if (!groups.has(val)) groups.set(val, []);
      groups.get(val).push(item);
    });

    let html = `
      <div class="expense-view-wrapper space-y-6">
        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="kpi-card p-4 rounded-lg bg-zinc-900 border border-zinc-800 shadow-sm">
            <span class="text-xs text-zinc-400 uppercase font-mono tracking-wider">Total Tracked Expenses</span>
            <div class="text-2xl font-bold font-mono text-emerald-400 mt-1">
              $${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span class="text-[11px] text-zinc-500 mt-1 block">${expenseItems.length} items with cost recorded</span>
          </div>

          <div class="kpi-card p-4 rounded-lg bg-zinc-900 border border-zinc-800 shadow-sm">
            <span class="text-xs text-zinc-400 uppercase font-mono tracking-wider">Expense Categories</span>
            <div class="text-2xl font-bold font-mono text-amber-400 mt-1">${groups.size}</div>
            <span class="text-[11px] text-zinc-500 mt-1 block">Grouped by ${groupByCat}</span>
          </div>

          <div class="kpi-card p-4 rounded-lg bg-zinc-900 border border-zinc-800 shadow-sm">
            <span class="text-xs text-zinc-400 uppercase font-mono tracking-wider">Average Per Item</span>
            <div class="text-2xl font-bold font-mono text-blue-400 mt-1">
              $${expenseItems.length ? (totalExpense / expenseItems.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </div>
            <span class="text-[11px] text-zinc-500 mt-1 block">Cost distribution metric</span>
          </div>
        </div>

        <!-- Group Breakdown Tables -->
        <div class="space-y-4">
    `;

    if (groups.size === 0) {
      html += `
        <div class="py-12 text-center text-zinc-500 border border-zinc-800 rounded-lg bg-zinc-900/40">
          <p class="text-sm">No expenses recorded yet.</p>
          <p class="text-xs mt-1 text-zinc-600">Include a dollar amount like "$150" in an item to track it here.</p>
        </div>
      `;
    } else {
      groups.forEach((groupItems, groupName) => {
        const subtotal = groupItems.reduce((acc, curr) => acc + Number(curr.cost), 0);
        html += `
          <div class="expense-group border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/60 shadow-sm">
            <div class="px-4 py-2.5 bg-zinc-800/80 border-b border-zinc-800 flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-xs font-bold text-zinc-200">${this.escapeHtml(groupName)}</span>
                <span class="text-xs text-zinc-500">(${groupItems.length} items)</span>
              </div>
              <div class="font-mono text-sm font-semibold text-emerald-400">
                Subtotal: $${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div class="divide-y divide-zinc-800/50">
              ${groupItems.map(item => this.renderExpenseRow(item)).join('')}
            </div>
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  }

  renderExpenseRow(item) {
    const isSelected = item.id === this.selectedItemId;
    const isDone = item.done;
    const when = item.getCategory('When');

    return `
      <div
        class="expense-row px-4 py-2 flex items-center justify-between hover:bg-zinc-800/40 cursor-pointer transition-colors ${isSelected ? 'bg-amber-950/30 border-l-2 border-amber-500' : ''}"
        data-item-id="${item.id}"
      >
        <div class="flex items-center space-x-3 flex-1 min-w-0">
          <input
            type="checkbox"
            class="done-checkbox w-4 h-4 rounded border-zinc-700 text-amber-500 bg-zinc-800 cursor-pointer"
            ${isDone ? 'checked' : ''}
            data-item-id="${item.id}"
          />
          <span class="text-sm truncate ${isDone ? 'line-through text-zinc-500' : 'text-zinc-200'}">
            ${this.escapeHtml(item.text)}
          </span>
        </div>

        <div class="flex items-center space-x-4">
          ${when ? `<span class="text-xs font-mono text-zinc-400">${when}</span>` : ''}
          <span class="font-mono text-sm font-bold text-emerald-400">$${Number(item.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelectorAll('.expense-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.done-checkbox')) return;
        const itemId = row.dataset.itemId;
        this.selectedItemId = itemId;
        if (this.onSelectItem) this.onSelectItem(itemId);
      });
    });

    this.container.querySelectorAll('.done-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        const itemId = cb.dataset.itemId;
        if (this.onToggleDone) this.onToggleDone(itemId);
      });
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
