/**
 * AgendaDatebookView.js - Lotus Agenda Datebook / Calendar Timeline View.
 * Displays scheduled tasks and events organized across days in a visual agenda layout.
 */

import { formatLocalDate } from '../utils/dateUtils.js';

export class AgendaDatebookView {
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

    // Filter items that have a 'When' date
    const datedItems = this.items.filter(item => Boolean(item.getCategory('When')));

    // Sort by date ascending
    datedItems.sort((a, b) => {
      const dateA = String(a.getCategory('When')).split('T')[0];
      const dateB = String(b.getCategory('When')).split('T')[0];
      return dateA.localeCompare(dateB);
    });

    // Group by Date
    const daysMap = new Map();
    datedItems.forEach(item => {
      const dateStr = String(item.getCategory('When')).split('T')[0];
      if (!daysMap.has(dateStr)) daysMap.set(dateStr, []);
      daysMap.get(dateStr).push(item);
    });

    if (daysMap.size === 0) {
      this.container.innerHTML = `
        <div class="py-16 text-center text-zinc-500">
          <p class="text-sm">No scheduled events or dated items found in this view.</p>
          <p class="text-xs mt-1 text-zinc-600">Assign a "When" date to items to display them in the Datebook.</p>
        </div>
      `;
      return;
    }

    const todayStr = formatLocalDate(new Date());

    let html = `<div class="datebook-container space-y-6">`;

    daysMap.forEach((dayItems, dateStr) => {
      const dateObj = new Date(dateStr + 'T12:00:00');
      const isToday = dateStr === todayStr;
      const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
      const monthDay = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

      html += `
        <div class="datebook-day border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/60 shadow-sm ${isToday ? 'ring-1 ring-amber-500/50' : ''}">
          <div class="day-header px-4 py-2.5 bg-zinc-800/80 border-b border-zinc-800 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <span class="text-sm font-bold ${isToday ? 'text-amber-400' : 'text-zinc-200'}">${dayName}</span>
              <span class="text-xs font-mono text-zinc-400">${monthDay}</span>
              ${isToday ? '<span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Today</span>' : ''}
            </div>
            <span class="text-xs font-mono text-zinc-500">${dayItems.length} scheduled</span>
          </div>

          <div class="day-items divide-y divide-zinc-800/40 p-1">
            ${dayItems.map(item => this.renderDatebookItem(item)).join('')}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    this.container.innerHTML = html;
    this.bindEvents();
  }

  renderDatebookItem(item) {
    const isSelected = item.id === this.selectedItemId;
    const isDone = item.done;
    const project = item.getCategory('Project');
    const priority = item.getCategory('Priority');
    const hasNote = Boolean(item.note && item.note.trim());

    return `
      <div
        class="datebook-item px-3 py-2 flex items-center justify-between hover:bg-zinc-800/50 cursor-pointer rounded transition-colors group ${isSelected ? 'bg-amber-950/30 border-l-2 border-amber-500' : ''}"
        data-item-id="${item.id}"
      >
        <div class="flex items-center space-x-3 flex-1 min-w-0">
          <input
            type="checkbox"
            class="done-checkbox w-4 h-4 rounded border-zinc-700 text-amber-500 focus:ring-amber-500 bg-zinc-800 cursor-pointer"
            ${isDone ? 'checked' : ''}
            data-item-id="${item.id}"
          />
          <span class="text-sm font-medium truncate ${isDone ? 'line-through text-zinc-500' : 'text-zinc-200'}">
            ${this.escapeHtml(item.text)}
          </span>
          ${hasNote ? `
            <span class="text-amber-400 text-xs" title="Has attached note">📝</span>
          ` : ''}
        </div>

        <div class="flex items-center space-x-2 text-xs">
          ${project ? `<span class="px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40 text-[11px]">📁 ${project}</span>` : ''}
          ${priority ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono border ${priority === 'Urgent' ? 'text-red-400 border-red-800' : 'text-zinc-400 border-zinc-700'}">${priority}</span>` : ''}
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelectorAll('.datebook-item').forEach(row => {
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
