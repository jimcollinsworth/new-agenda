/**
 * AgendaMatrixView.js - Lotus Agenda 2D Matrix / Cross-Tabulation View.
 * Cross-references two categories (e.g., Row: Project vs Col: Status, or Row: People vs Col: Priority).
 */

export class AgendaMatrixView {
  constructor({
    container,
    onSelectItem
  }) {
    this.container = container;
    this.onSelectItem = onSelectItem;
  }

  render(items, viewConfig, categories = []) {
    this.items = items || [];
    this.viewConfig = viewConfig;
    this.categories = categories;

    const rowCatName = viewConfig.matrixRowCategory || 'Project';
    const colCatName = viewConfig.matrixColCategory || 'Status';

    const rowCat = categories.find(c => c.name === rowCatName);
    const colCat = categories.find(c => c.name === colCatName);

    // Get row values and column values from category definitions or items (including multi-value categories)
    const extractValues = (cat, catName) => {
      if (cat && cat.values && cat.values.length > 0) {
        return cat.values.map(v => v.name);
      }
      const set = new Set();
      this.items.forEach(i => {
        const val = i.getCategory(catName);
        if (Array.isArray(val)) val.forEach(v => set.add(v));
        else if (val) set.add(val);
      });
      return Array.from(set);
    };

    const rowValues = extractValues(rowCat, rowCatName);
    const colValues = extractValues(colCat, colCatName);

    if (rowValues.length === 0 || colValues.length === 0) {
      this.container.innerHTML = `
        <div class="py-16 text-center text-zinc-500">
          <p class="text-sm">Cannot render Matrix: insufficient category values for ${rowCatName} or ${colCatName}.</p>
        </div>
      `;
      return;
    }

    // Build grid cells: cell[r][c] = items
    const grid = {};
    rowValues.forEach(r => {
      grid[r] = {};
      colValues.forEach(c => {
        grid[r][c] = [];
      });
    });

    this.items.forEach(item => {
      const rRaw = item.getCategory(rowCatName);
      const cRaw = item.getCategory(colCatName);
      const rVals = Array.isArray(rRaw) ? rRaw : (rRaw ? [rRaw] : []);
      const cVals = Array.isArray(cRaw) ? cRaw : (cRaw ? [cRaw] : []);

      rVals.forEach(r => {
        cVals.forEach(c => {
          if (grid[r] && grid[r][c]) {
            grid[r][c].push(item);
          }
        });
      });
    });

    let html = `
      <div class="matrix-wrapper overflow-x-auto border border-zinc-800 rounded-lg bg-zinc-900/60 shadow-sm p-3">
        <div class="mb-3 flex items-center justify-between text-xs text-zinc-400">
          <div>Matrix: <strong class="text-zinc-200">${rowCatName}</strong> (Rows) &times; <strong class="text-zinc-200">${colCatName}</strong> (Columns)</div>
        </div>

        <table class="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th class="p-2 border border-zinc-800 bg-zinc-800/90 text-left font-mono text-zinc-400 font-semibold w-40">
                ${rowCatName} \\ ${colCatName}
              </th>
              ${colValues.map(col => `
                <th class="p-2 border border-zinc-800 bg-zinc-800/80 text-center font-mono text-zinc-300 font-semibold min-w-[140px]">
                  ${this.escapeHtml(col)}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${rowValues.map(row => `
              <tr>
                <td class="p-2 border border-zinc-800 bg-zinc-800/50 font-medium text-zinc-200 font-mono text-[11px]">
                  ${this.escapeHtml(row)}
                </td>
                ${colValues.map(col => {
                  const cellItems = grid[row][col] || [];
                  return `
                    <td class="p-2 border border-zinc-800 align-top bg-zinc-900/40 hover:bg-zinc-800/30 transition-colors">
                      <div class="space-y-1.5 min-h-[50px]">
                        ${cellItems.map(item => `
                          <div
                            class="matrix-item p-1.5 rounded bg-zinc-800 border border-zinc-700/60 hover:border-amber-500/60 cursor-pointer text-[11px] text-zinc-200 truncate transition-colors"
                            data-item-id="${item.id}"
                            title="${this.escapeHtml(item.text)}"
                          >
                            ${item.done ? '✓ ' : ''}${this.escapeHtml(item.text)}
                          </div>
                        `).join('')}
                      </div>
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    this.container.innerHTML = html;

    this.container.querySelectorAll('.matrix-item').forEach(el => {
      el.addEventListener('click', () => {
        const itemId = el.dataset.itemId;
        if (this.onSelectItem) this.onSelectItem(itemId);
      });
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
