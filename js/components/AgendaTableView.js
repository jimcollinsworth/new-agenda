/**
 * AgendaTableView.js - Lotus Agenda Multi-Column Table View.
 * Displays items in a customizable tabular layout where columns map directly
 * to Categories (When, Project, Priority, People, Status, Cost, etc.)
 */

export class AgendaTableView {
  constructor({
    container,
    onSelectItem,
    onToggleDone,
    onDeleteItem,
    onUpdateCategory
  }) {
    this.container = container;
    this.onSelectItem = onSelectItem;
    this.onToggleDone = onToggleDone;
    this.onDeleteItem = onDeleteItem;
    this.onUpdateCategory = onUpdateCategory;

    this.selectedItemId = null;
    this.sortCol = 'When';
    this.sortAsc = true;
  }

  render(items, viewConfig, categories = []) {
    this.items = items || [];
    this.viewConfig = viewConfig;
    this.categories = categories;

    if (this.items.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state flex flex-col items-center justify-center py-16 text-center text-zinc-500">
          <p class="text-sm font-medium text-zinc-400">No items match current view</p>
        </div>
      `;
      return;
    }

    const columns = viewConfig.columns || ['When', 'Priority', 'Project', 'People', 'Status'];

    // Sort items
    const sorted = [...this.items].sort((a, b) => {
      let valA = a.getCategory(this.sortCol);
      let valB = b.getCategory(this.sortCol);
      if (this.sortCol === 'Item') {
        valA = a.text;
        valB = b.text;
      }
      if (!valA) return this.sortAsc ? 1 : -1;
      if (!valB) return this.sortAsc ? -1 : 1;
      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });

    let html = `
      <div class="table-wrapper overflow-x-auto border border-zinc-800 rounded-lg bg-zinc-900/70 shadow-sm">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-zinc-800 bg-zinc-800/90 text-zinc-400 select-none font-mono">
              <th class="w-10 px-3 py-2 text-center">Done</th>
              <th class="px-3 py-2 cursor-pointer hover:text-zinc-200" data-sort="Item">
                Item Headline ${this.sortCol === 'Item' ? (this.sortAsc ? '▲' : '▼') : ''}
              </th>
              ${columns.map(col => `
                <th class="px-3 py-2 cursor-pointer hover:text-zinc-200" data-sort="${col}">
                  ${col} ${this.sortCol === col ? (this.sortAsc ? '▲' : '▼') : ''}
                </th>
              `).join('')}
              <th class="w-12 px-2 py-2 text-center">Notes</th>
              <th class="w-10 px-2 py-2 text-center"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/50">
            ${sorted.map(item => this.renderTableRow(item, columns)).join('')}
          </tbody>
        </table>
      </div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  }

  renderTableRow(item, columns) {
    const isSelected = item.id === this.selectedItemId;
    const isDone = item.done;
    const hasNote = Boolean(item.note && item.note.trim());

    return `
      <tr
        class="table-row hover:bg-zinc-800/60 cursor-pointer transition-colors group ${isSelected ? 'bg-amber-950/30' : ''}"
        data-item-id="${item.id}"
      >
        <td class="px-3 py-2 text-center">
          <input
            type="checkbox"
            class="done-checkbox w-4 h-4 rounded border-zinc-700 text-amber-500 focus:ring-amber-500 bg-zinc-800 cursor-pointer"
            ${isDone ? 'checked' : ''}
            data-item-id="${item.id}"
          />
        </td>

        <td class="px-3 py-2 font-medium max-w-xs truncate ${isDone ? 'line-through text-zinc-500' : 'text-zinc-200'}">
          ${this.escapeHtml(item.text)}
        </td>

        ${columns.map(col => {
          const val = item.getCategory(col);
          return `<td class="cat-cell px-3 py-2 text-zinc-300 font-mono text-[11px] whitespace-nowrap hover:bg-zinc-700/40 rounded transition-colors" data-col="${col}" data-item-id="${item.id}" title="Click to edit ${col}">
            ${this.renderCellValue(col, val, item)}
          </td>`;
        }).join('')}

        <td class="px-2 py-2 text-center text-zinc-400">
          ${hasNote ? `
            <span class="inline-flex text-amber-400" title="Has attached note">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
            </span>
          ` : '<span class="text-zinc-600">-</span>'}
        </td>

        <td class="px-2 py-2 text-center">
          <button class="delete-item-btn opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-1 transition-opacity" data-item-id="${item.id}">
            ✕
          </button>
        </td>
      </tr>
    `;
  }

  renderCellValue(categoryName, value, item) {
    if (categoryName === 'Cost') {
      const cost = item.cost !== null ? item.cost : value;
      return cost !== null && cost !== undefined ? `<span class="text-emerald-400 font-semibold">$${Number(cost).toLocaleString()}</span>` : '<span class="text-zinc-600 hover:text-zinc-400">+ Cost</span>';
    }

    if (!value) return `<span class="text-zinc-600 hover:text-zinc-400">+ ${categoryName}</span>`;

    if (Array.isArray(value)) {
      return value.map(v => `<span class="inline-block px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 mr-1">${this.escapeHtml(v)}</span>`).join('');
    }

    if (categoryName === 'Priority') {
      const color = value === 'Urgent' ? 'text-red-400 bg-red-950/40 border-red-800' :
                    value === 'High' ? 'text-orange-400 bg-orange-950/40 border-orange-800' :
                    value === 'Medium' ? 'text-yellow-400 bg-yellow-950/40 border-yellow-800' :
                    'text-zinc-300 bg-zinc-800 border-zinc-700';
      return `<span class="px-1.5 py-0.5 rounded border ${color}">${this.escapeHtml(value)}</span>`;
    }

    if (categoryName === 'Status') {
      const sColor = value === 'Done' ? 'text-emerald-400 border-emerald-800 bg-emerald-950/30' :
                     value === 'In Progress' ? 'text-blue-400 border-blue-800 bg-blue-950/30' :
                     value === 'Blocked' ? 'text-red-400 border-red-800 bg-red-950/30' :
                     'text-zinc-400 border-zinc-700 bg-zinc-800/40';
      return `<span class="px-1.5 py-0.5 rounded border ${sColor}">${this.escapeHtml(value)}</span>`;
    }

    return `<span class="text-zinc-300">${this.escapeHtml(String(value))}</span>`;
  }

  bindEvents() {
    // Sort column clicks
    this.container.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (this.sortCol === col) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortCol = col;
          this.sortAsc = true;
        }
        this.render(this.items, this.viewConfig, this.categories);
      });
    });

    // Row selection
    this.container.querySelectorAll('.table-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.done-checkbox') || e.target.closest('.delete-item-btn')) return;
        const itemId = row.dataset.itemId;
        this.selectItem(itemId);
      });
    });

    // Checkbox toggle
    this.container.querySelectorAll('.done-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        const itemId = cb.dataset.itemId;
        if (this.onToggleDone) this.onToggleDone(itemId);
      });
    });

    // In-table Category Cell Click-to-Edit
    this.container.querySelectorAll('.cat-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = cell.dataset.itemId;
        const col = cell.dataset.col;
        const item = this.items.find(i => i.id === itemId);
        if (!item || !this.onUpdateCategory) return;

        const currentVal = item.getCategory(col);
        if (col === 'Priority') {
          const priorities = ['Urgent', 'High', 'Medium', 'Low', ''];
          const nextIdx = (priorities.indexOf(currentVal) + 1) % priorities.length;
          this.onUpdateCategory(itemId, col, priorities[nextIdx] || null);
        } else if (col === 'Status') {
          const statuses = ['Pending', 'In Progress', 'Blocked', 'Done'];
          const nextIdx = (statuses.indexOf(currentVal) + 1) % statuses.length;
          this.onUpdateCategory(itemId, col, statuses[nextIdx]);
        } else if (col === 'Cost') {
          const input = prompt(`Enter cost for "${item.text}":`, item.cost !== null ? item.cost : '');
          if (input !== null) {
            const num = input.trim() ? parseFloat(input.replace(/[^0-9.-]/g, '')) : null;
            item.cost = num;
            this.onUpdateCategory(itemId, 'Cost', num);
          }
        } else if (col === 'When') {
          const input = prompt(`Enter due date (YYYY-MM-DD or e.g. "tomorrow", "Friday"):`, currentVal || '');
          if (input !== null) {
            this.onUpdateCategory(itemId, 'When', input.trim() || null);
          }
        } else {
          const input = prompt(`Assign value for ${col}:`, Array.isArray(currentVal) ? currentVal.join(', ') : (currentVal || ''));
          if (input !== null) {
            this.onUpdateCategory(itemId, col, input.trim() || null);
          }
        }
      });
    });

    // Delete item
    this.container.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.itemId;
        if (confirm('Delete this item?')) {
          if (this.onDeleteItem) this.onDeleteItem(itemId);
        }
      });
    });
  }

  selectItem(itemId) {
    this.selectedItemId = itemId;
    this.container.querySelectorAll('.table-row').forEach(r => {
      if (r.dataset.itemId === itemId) {
        r.classList.add('bg-amber-950/30');
      } else {
        r.classList.remove('bg-amber-950/30');
      }
    });
    if (this.onSelectItem) this.onSelectItem(itemId);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
