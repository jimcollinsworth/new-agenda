/**
 * AmbiguousTriageModal.js - President's Planner "? Ambiguous Statements" Triage Center.
 * Identifies unclassified or incomplete notes and allows rapid 1-click resolution.
 */

import { DataUtilities } from '../services/dataUtilities.js';
import { formatLocalDate, addDays } from '../utils/dateUtils.js';

export class AmbiguousTriageModal {
  constructor({
    container,
    getItems,
    getCategories,
    onResolveItem,
    onTriageCompleted
  }) {
    this.container = container;
    this.getItems = getItems;
    this.getCategories = getCategories;
    this.onResolveItem = onResolveItem;
    this.onTriageCompleted = onTriageCompleted;

    this.render();
  }

  show() {
    this.refresh();
    this.modalEl.classList.remove('hidden');
  }

  hide() {
    this.modalEl.classList.add('hidden');
  }

  refresh() {
    const items = this.getItems ? this.getItems() : [];
    const ambiguousList = DataUtilities.findAmbiguousItems(items);
    this.renderList(ambiguousList);
  }

  render() {
    this.container.innerHTML = `
      <div id="triage-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
        <div class="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden text-zinc-100">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
            <div class="flex items-center space-x-3">
              <div class="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <h3 class="font-bold text-base text-zinc-100 flex items-center gap-2">
                  ? Ambiguous Statements Triage Center
                  <span id="triage-badge-count" class="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">0 Ambiguous</span>
                </h3>
                <p class="text-xs text-zinc-400">President's Planner automated filter for items requiring dates, projects, or owners</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button id="btn-triage-resolve-all" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors">
                ⚡ Auto-Resolve All
              </button>
              <button id="triage-modal-close" class="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 text-lg">✕</button>
            </div>
          </div>

          <!-- Items List Area -->
          <div id="triage-list-container" class="flex-1 overflow-y-auto p-6 space-y-4">
            <!-- Rendered by renderList -->
          </div>
        </div>
      </div>
    `;

    this.modalEl = this.container.querySelector('#triage-modal');
    this.listContainer = this.container.querySelector('#triage-list-container');
    this.badgeCount = this.container.querySelector('#triage-badge-count');

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelector('#triage-modal-close').addEventListener('click', () => this.hide());

    this.container.querySelector('#btn-triage-resolve-all').addEventListener('click', () => {
      const items = this.getItems ? this.getItems() : [];
      const ambiguousList = DataUtilities.findAmbiguousItems(items);
      const todayStr = formatLocalDate(new Date());

      ambiguousList.forEach(({ item }) => {
        const hasPeople = item.getCategory('People') && (!Array.isArray(item.getCategory('People')) || item.getCategory('People').length > 0);
        DataUtilities.resolveAmbiguousItem(item, {
          when: item.getCategory('When') || todayStr,
          project: item.getCategory('Project') || 'Personal',
          priority: item.getCategory('Priority') || 'Medium',
          person: hasPeople ? null : 'Sarah',
          status: item.getCategory('Status') || 'Pending'
        });
      });

      if (this.onTriageCompleted) this.onTriageCompleted();
      this.refresh();
    });
  }

  renderList(ambiguousList) {
    this.badgeCount.textContent = `${ambiguousList.length} Ambiguous`;

    if (ambiguousList.length === 0) {
      this.listContainer.innerHTML = `
        <div class="text-center py-20 space-y-3">
          <div class="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xl">
            ✓
          </div>
          <h4 class="font-bold text-base text-zinc-200">No Ambiguous Statements Found</h4>
          <p class="text-xs text-zinc-400 max-w-md mx-auto">
            All items in your workspace have assigned dates, projects, priorities, and action owners.
          </p>
        </div>
      `;
      return;
    }

    const todayStr = formatLocalDate(new Date());
    const tomorrowStr = formatLocalDate(addDays(new Date(), 1));
    const nextWeekStr = formatLocalDate(addDays(new Date(), 7));

    const categories = this.getCategories ? this.getCategories() : [];
    const projectCat = categories.find(c => c.name === 'Project');
    const projectValues = projectCat && projectCat.values ? projectCat.values.map(v => v.name) : ['Death Star', 'Website Redesign', 'Finance & Compliance', 'Personal'];

    const peopleCat = categories.find(c => c.name === 'People');
    const peopleValues = peopleCat && peopleCat.values ? peopleCat.values.map(v => v.name) : ['Sarah', 'Tom', 'Bob', 'Alex'];

    this.listContainer.innerHTML = ambiguousList.map(({ item, reasons }) => `
      <div class="triage-card p-4 rounded-xl bg-zinc-800/80 border border-zinc-700 space-y-3" data-id="${item.id}">
        <div class="flex items-start justify-between">
          <div class="space-y-1 flex-1 pr-4">
            <span class="font-bold text-sm text-zinc-100">${item.text}</span>
            <div class="flex flex-wrap gap-1.5 text-[11px] font-mono text-amber-400 pt-1">
              ${reasons.map(r => `<span class="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">⚠️ ${r}</span>`).join('')}
            </div>
          </div>
          <button class="btn-dismiss-triage px-2.5 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-mono transition-colors" data-id="${item.id}">
            Dismiss
          </button>
        </div>

        <!-- 1-Click Fast Resolution Toolstrip -->
        <div class="pt-2 border-t border-zinc-700/60 flex flex-wrap items-center gap-3 text-xs font-mono">
          <!-- When Buttons -->
          <div class="flex items-center space-x-1">
            <span class="text-zinc-500 mr-1">When:</span>
            <button class="pill-resolve px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700 transition-colors" data-id="${item.id}" data-cat="when" data-val="${todayStr}">Today</button>
            <button class="pill-resolve px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700 transition-colors" data-id="${item.id}" data-cat="when" data-val="${tomorrowStr}">Tomorrow</button>
            <button class="pill-resolve px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700 transition-colors" data-id="${item.id}" data-cat="when" data-val="${nextWeekStr}">Next Week</button>
          </div>

          <!-- Project Buttons -->
          <div class="flex items-center space-x-1">
            <span class="text-zinc-500 mr-1">Project:</span>
            ${projectValues.slice(0, 3).map(p => `
              <button class="pill-resolve px-2 py-0.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 transition-colors" data-id="${item.id}" data-cat="project" data-val="${p}">${p}</button>
            `).join('')}
          </div>

          <!-- People Buttons -->
          <div class="flex items-center space-x-1">
            <span class="text-zinc-500 mr-1">Person:</span>
            ${peopleValues.slice(0, 3).map(p => `
              <button class="pill-resolve px-2 py-0.5 rounded bg-pink-900/60 hover:bg-pink-800 text-pink-200 border border-pink-700 transition-colors" data-id="${item.id}" data-cat="person" data-val="${p}">${p}</button>
            `).join('')}
          </div>

          <!-- Priority Buttons -->
          <div class="flex items-center space-x-1">
            <span class="text-zinc-500 mr-1">Priority:</span>
            <button class="pill-resolve px-2 py-0.5 rounded bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 transition-colors" data-id="${item.id}" data-cat="priority" data-val="Urgent">Urgent</button>
            <button class="pill-resolve px-2 py-0.5 rounded bg-orange-900/60 hover:bg-orange-800 text-orange-200 border border-orange-700 transition-colors" data-id="${item.id}" data-cat="priority" data-val="High">High</button>
            <button class="pill-resolve px-2 py-0.5 rounded bg-yellow-900/60 hover:bg-yellow-800 text-yellow-200 border border-yellow-700 transition-colors" data-id="${item.id}" data-cat="priority" data-val="Medium">Medium</button>
          </div>
        </div>
      </div>
    `).join('');

    // Bind pill clicks
    this.listContainer.querySelectorAll('.pill-resolve').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const cat = btn.dataset.cat;
        const val = btn.dataset.val;
        const items = this.getItems ? this.getItems() : [];
        const targetItem = items.find(i => i.id === id);
        if (targetItem) {
          const updates = {};
          updates[cat] = val;
          DataUtilities.resolveAmbiguousItem(targetItem, updates);
          if (this.onResolveItem) this.onResolveItem(targetItem);
          this.refresh();
        }
      });
    });

    this.listContainer.querySelectorAll('.btn-dismiss-triage').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const items = this.getItems ? this.getItems() : [];
        const targetItem = items.find(i => i.id === id);
        if (targetItem) {
          targetItem.setCategory('Ambiguous', 'Dismissed');
          targetItem.dismissedAmbiguous = true;
          if (this.onResolveItem) this.onResolveItem(targetItem);
          this.refresh();
        }
      });
    });
  }
}
