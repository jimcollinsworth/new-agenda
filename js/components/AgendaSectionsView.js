/**
 * AgendaSectionsView.js - Lotus Agenda Classic Section-Grouped View.
 * Renders items categorized into collapsible, structured sections
 * (e.g., Overdue, Today, This Week, No Date, or by Project/Status).
 */

import { formatLocalDate, addDays } from '../utils/dateUtils.js';

export class AgendaSectionsView {
  constructor({
    container,
    onSelectItem,
    onToggleDone,
    onDeleteItem,
    onQuickAdd
  }) {
    this.container = container;
    this.onSelectItem = onSelectItem;
    this.onToggleDone = onToggleDone;
    this.onDeleteItem = onDeleteItem;
    this.onQuickAdd = onQuickAdd;

    this.selectedItemId = null;
    this.collapsedSections = new Set();
  }

  render(items, viewConfig, categories = []) {
    this.items = items || [];
    this.viewConfig = viewConfig;
    this.categories = categories;

    if (this.items.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state flex flex-col items-center justify-center py-16 text-center text-zinc-500">
          <svg class="w-12 h-12 mb-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p class="text-sm font-medium text-zinc-400">No items match current view & filter</p>
          <p class="text-xs mt-1 text-zinc-600">Type above in the Omnibar to create a new item or search</p>
        </div>
      `;
      return;
    }

    const sections = this.groupItemsIntoSections(this.items, viewConfig.sectionCategory || 'When');

    let html = `<div class="agenda-sections-list space-y-4">`;

    sections.forEach(sec => {
      const isCollapsed = this.collapsedSections.has(sec.id);
      const count = sec.items.length;
      const countBadge = `<span class="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">${count}</span>`;

      html += `
        <div class="section-card border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/60 shadow-sm" data-section-id="${sec.id}">
          <!-- Section Header -->
          <div class="section-header px-3.5 py-2.5 bg-zinc-800/80 border-b border-zinc-800/80 flex items-center justify-between cursor-pointer select-none hover:bg-zinc-800 transition-colors">
            <div class="flex items-center space-x-2">
              <span class="collapse-icon text-zinc-400 text-xs transform transition-transform ${isCollapsed ? '-rotate-90' : ''}">▼</span>
              <span class="section-title text-xs font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                ${sec.icon ? `<span>${sec.icon}</span>` : ''}
                ${sec.title}
              </span>
              ${countBadge}
            </div>
            <div class="flex items-center space-x-2">
              <button class="quick-add-btn text-xs text-zinc-400 hover:text-amber-400 px-1.5 py-0.5 rounded hover:bg-zinc-700 transition-colors flex items-center gap-1" title="Add item to this section" data-section="${sec.title}">
                + Add
              </button>
            </div>
          </div>

          <!-- Section Body -->
          <div class="section-body divide-y divide-zinc-800/40 ${isCollapsed ? 'hidden' : ''}">
            ${sec.items.map(item => this.renderItemRow(item, viewConfig)).join('')}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    this.container.innerHTML = html;

    this.bindEvents();
  }

  renderItemRow(item, viewConfig) {
    const isSelected = item.id === this.selectedItemId;
    const hasNote = Boolean(item.note && item.note.trim());
    const isDone = item.done;

    // Build category badges
    const badges = [];

    // Priority badge
    const priority = item.getCategory('Priority');
    if (priority) {
      const pColor = priority === 'Urgent' ? 'text-red-400 bg-red-950/40 border-red-800/50' :
                     priority === 'High' ? 'text-orange-400 bg-orange-950/40 border-orange-800/50' :
                     priority === 'Medium' ? 'text-yellow-400 bg-yellow-950/40 border-yellow-800/50' :
                     'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';
      badges.push(`<span class="text-[10px] font-mono px-1.5 py-0.5 rounded border ${pColor}">${priority}</span>`);
    }

    // Project badge
    const project = item.getCategory('Project');
    if (project && viewConfig.sectionCategory !== 'Project') {
      badges.push(`<span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40">📁 ${project}</span>`);
    }

    // When badge
    const when = item.getCategory('When');
    if (when && viewConfig.sectionCategory !== 'When') {
      badges.push(`<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-800/40">📅 ${when}</span>`);
    }

    // People badge
    const people = item.getCategory('People');
    if (people) {
      const names = Array.isArray(people) ? people.join(', ') : people;
      badges.push(`<span class="text-[10px] px-1.5 py-0.5 rounded bg-pink-950/40 text-pink-300 border border-pink-800/40">👤 ${names}</span>`);
    }

    // Cost badge
    if (item.cost !== null && item.cost !== undefined) {
      badges.push(`<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 font-semibold">$${Number(item.cost).toLocaleString()}</span>`);
    }

    return `
      <div
        class="item-row px-3.5 py-2 flex items-center justify-between hover:bg-zinc-800/50 cursor-pointer transition-colors group ${isSelected ? 'bg-amber-950/30 border-l-2 border-amber-500' : ''}"
        data-item-id="${item.id}"
      >
        <div class="flex items-center space-x-2.5 flex-1 min-w-0 mr-3">
          <!-- Done Checkbox -->
          <input
            type="checkbox"
            class="done-checkbox w-4 h-4 rounded border-zinc-700 text-amber-500 focus:ring-amber-500 bg-zinc-800 cursor-pointer"
            ${isDone ? 'checked' : ''}
            data-item-id="${item.id}"
          />

          <!-- Item Text -->
          <span class="item-text text-sm truncate flex-1 ${isDone ? 'line-through text-zinc-500' : 'text-zinc-200'}">
            ${this.escapeHtml(item.text)}
          </span>

          <!-- Has Note Indicator -->
          ${hasNote ? `
            <span class="note-indicator text-zinc-400 hover:text-amber-400 text-xs flex items-center" title="Has attached note">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
            </span>
          ` : ''}
        </div>

        <!-- Badges & Action Buttons -->
        <div class="flex items-center space-x-2 flex-shrink-0">
          <div class="badges-container hidden sm:flex items-center space-x-1.5">
            ${badges.join('')}
          </div>
          <button class="delete-item-btn opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-700/50 transition-opacity" title="Delete item" data-item-id="${item.id}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      </div>
    `;
  }

  groupItemsIntoSections(items, sectionCategory) {
    const today = formatLocalDate(new Date());

    // Special grouping for 'When' (Agenda date brackets)
    if (sectionCategory === 'When') {
      const overdue = [];
      const dueToday = [];
      const dueTomorrow = [];
      const thisWeek = [];
      const later = [];
      const noDate = [];
      const completed = [];

      const tomorrowStr = formatLocalDate(addDays(new Date(), 1));
      const endOfWeekStr = formatLocalDate(addDays(new Date(), 7));

      items.forEach(item => {
        if (item.done) {
          completed.push(item);
          return;
        }

        const when = item.getCategory('When');
        if (!when) {
          noDate.push(item);
          return;
        }

        const dateStr = String(when).split('T')[0];
        if (dateStr < today) {
          overdue.push(item);
        } else if (dateStr === today) {
          dueToday.push(item);
        } else if (dateStr === tomorrowStr) {
          dueTomorrow.push(item);
        } else if (dateStr <= endOfWeekStr) {
          thisWeek.push(item);
        } else {
          later.push(item);
        }
      });

      const sections = [];
      if (overdue.length > 0) sections.push({ id: 'overdue', title: 'Overdue', icon: '⚠️', items: overdue });
      if (dueToday.length > 0 || (overdue.length === 0 && thisWeek.length === 0)) {
        sections.push({ id: 'today', title: 'Due Today', icon: '☀️', items: dueToday });
      }
      if (dueTomorrow.length > 0) sections.push({ id: 'tomorrow', title: 'Due Tomorrow', icon: '🌅', items: dueTomorrow });
      if (thisWeek.length > 0) sections.push({ id: 'this_week', title: 'Due This Week', icon: '📅', items: thisWeek });
      if (later.length > 0) sections.push({ id: 'later', title: 'Later & Upcoming', icon: '🗓️', items: later });
      if (noDate.length > 0) sections.push({ id: 'no_date', title: 'No Due Date', icon: '📋', items: noDate });
      if (completed.length > 0) sections.push({ id: 'completed', title: 'Completed Recently', icon: '✅', items: completed });

      return sections;
    }

    // Generic grouping by other categories (Project, Status, Priority, People)
    const map = new Map();
    const unassigned = [];

    items.forEach(item => {
      const val = item.getCategory(sectionCategory);
      if (!val) {
        unassigned.push(item);
      } else if (Array.isArray(val)) {
        val.forEach(v => {
          if (!map.has(v)) map.set(v, []);
          map.get(v).push(item);
        });
      } else {
        if (!map.has(val)) map.set(val, []);
        map.get(val).push(item);
      }
    });

    const sections = [];
    map.forEach((secItems, secTitle) => {
      sections.push({
        id: 'sec_' + secTitle.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        title: secTitle,
        items: secItems
      });
    });

    if (unassigned.length > 0) {
      sections.push({
        id: 'sec_unassigned',
        title: `No ${sectionCategory}`,
        items: unassigned
      });
    }

    return sections;
  }

  bindEvents() {
    // Collapsible header toggle
    this.container.querySelectorAll('.section-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('.quick-add-btn')) return;
        const card = header.closest('.section-card');
        const secId = card.dataset.sectionId;
        const body = card.querySelector('.section-body');
        const icon = header.querySelector('.collapse-icon');

        if (this.collapsedSections.has(secId)) {
          this.collapsedSections.delete(secId);
          body.classList.remove('hidden');
          icon.classList.remove('-rotate-90');
        } else {
          this.collapsedSections.add(secId);
          body.classList.add('hidden');
          icon.classList.add('-rotate-90');
        }
      });
    });

    // Quick add button
    this.container.querySelectorAll('.quick-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sectionTitle = btn.dataset.section;
        if (this.onQuickAdd) {
          this.onQuickAdd(this.viewConfig.sectionCategory, sectionTitle);
        }
      });
    });

    // Item row click (selects item and opens note)
    this.container.querySelectorAll('.item-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.done-checkbox') || e.target.closest('.delete-item-btn')) return;
        const itemId = row.dataset.itemId;
        this.selectItem(itemId);
      });
    });

    // Done checkbox
    this.container.querySelectorAll('.done-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        const itemId = cb.dataset.itemId;
        if (this.onToggleDone) this.onToggleDone(itemId);
      });
    });

    // Delete button
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
    this.container.querySelectorAll('.item-row').forEach(r => {
      if (r.dataset.itemId === itemId) {
        r.classList.add('bg-amber-950/30', 'border-l-2', 'border-amber-500');
      } else {
        r.classList.remove('bg-amber-950/30', 'border-l-2', 'border-amber-500');
      }
    });
    if (this.onSelectItem) this.onSelectItem(itemId);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
