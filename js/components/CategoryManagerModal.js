/**
 * CategoryManagerModal.js - Lotus Agenda Category & Assignment Rule Manager.
 * Allows adding/editing categories, values, keywords, and automatic assignment rules.
 */

import { Category, CategoryValue } from '../models/Category.js';
import { Rule } from '../models/Rule.js';

export class CategoryManagerModal {
  constructor({
    container,
    categories,
    rules,
    onSaveCategories,
    onSaveRules
  }) {
    this.container = container;
    this.categories = categories || [];
    this.rules = rules || [];
    this.onSaveCategories = onSaveCategories;
    this.onSaveRules = onSaveRules;

    this.activeTab = 'categories'; // 'categories' or 'rules'
    this.selectedCat = this.categories[0] || null;
    this.render();
  }

  show() {
    this.modalEl.classList.remove('hidden');
    this.renderContent();
  }

  hide() {
    this.modalEl.classList.add('hidden');
  }

  render() {
    this.container.innerHTML = `
      <div id="category-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div class="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden text-zinc-100">
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
            <div class="flex items-center space-x-3">
              <div class="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
              </div>
              <div>
                <h3 class="font-bold text-base text-zinc-100">Lotus Agenda Category & Rule Manager</h3>
                <p class="text-xs text-zinc-400">Manage classification dimensions, keyword auto-matching, and assignment rules</p>
              </div>
            </div>

            <!-- Tabs & Close -->
            <div class="flex items-center space-x-3">
              <div class="flex rounded-lg bg-zinc-800 p-1 border border-zinc-700">
                <button class="cat-tab-btn px-3 py-1 text-xs rounded font-medium transition-colors ${this.activeTab === 'categories' ? 'bg-zinc-700 text-amber-400' : 'text-zinc-400'}" data-tab="categories">
                  Categories & Values
                </button>
                <button class="cat-tab-btn px-3 py-1 text-xs rounded font-medium transition-colors ${this.activeTab === 'rules' ? 'bg-zinc-700 text-amber-400' : 'text-zinc-400'}" data-tab="rules">
                  Assignment Rules
                </button>
              </div>
              <button id="cat-modal-close" class="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 text-lg">✕</button>
            </div>
          </div>

          <!-- Modal Body Area -->
          <div id="cat-modal-body" class="flex-1 overflow-hidden p-6">
            <!-- Dynamically rendered -->
          </div>
        </div>
      </div>
    `;

    this.modalEl = this.container.querySelector('#category-modal');
    this.modalBody = this.container.querySelector('#cat-modal-body');

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelector('#cat-modal-close').addEventListener('click', () => this.hide());

    this.container.querySelectorAll('.cat-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this.container.querySelectorAll('.cat-tab-btn').forEach(b => {
          b.classList.remove('bg-zinc-700', 'text-amber-400');
          b.classList.add('text-zinc-400');
        });
        btn.classList.add('bg-zinc-700', 'text-amber-400');
        btn.classList.remove('text-zinc-400');
        this.renderContent();
      });
    });
  }

  renderContent() {
    if (this.activeTab === 'categories') {
      this.renderCategoriesTab();
    } else {
      this.renderRulesTab();
    }
  }

  renderCategoriesTab() {
    if (!this.selectedCat && this.categories.length > 0) {
      this.selectedCat = this.categories[0];
    }

    this.modalBody.innerHTML = `
      <div class="h-full flex space-x-6">
        <!-- Categories List (Left Pane) -->
        <div class="w-1/3 h-full border-r border-zinc-800 pr-4 flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">Categories</span>
            <button id="btn-add-category" class="text-xs text-amber-400 hover:text-amber-300 font-medium">+ Add New</button>
          </div>

          <div class="flex-1 overflow-y-auto space-y-1.5 pr-1">
            ${this.categories.map(cat => `
              <div
                class="cat-item-btn p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${this.selectedCat && this.selectedCat.id === cat.id ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 font-semibold' : 'bg-zinc-800/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800'}"
                data-cat-id="${cat.id}"
              >
                <div class="flex items-center space-x-2 truncate">
                  <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${cat.color || '#6366f1'}"></span>
                  <span class="truncate">${cat.name}</span>
                </div>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">${cat.type}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Category Details & Values (Right Pane) -->
        <div class="w-2/3 h-full overflow-y-auto pl-2 flex flex-col">
          ${this.selectedCat ? this.renderCategoryDetails(this.selectedCat) : '<p class="text-zinc-500 text-sm">Select a category</p>'}
        </div>
      </div>
    `;

    // Bind left pane category clicks
    this.modalBody.querySelectorAll('.cat-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.dataset.catId;
        this.selectedCat = this.categories.find(c => c.id === catId);
        this.renderCategoriesTab();
      });
    });

    // Add category button
    this.modalBody.querySelector('#btn-add-category').addEventListener('click', () => {
      const name = prompt('New Category Name (e.g. Location, Client, Milestone):');
      if (name && name.trim()) {
        const newCat = new Category({ name: name.trim(), type: 'text' });
        this.categories.push(newCat);
        this.selectedCat = newCat;
        if (this.onSaveCategories) this.onSaveCategories(this.categories);
        this.renderCategoriesTab();
      }
    });

    if (this.selectedCat) {
      this.bindCategoryDetailsEvents();
    }
  }

  renderCategoryDetails(cat) {
    return `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-800">
          <div>
            <label class="block text-xs font-medium text-zinc-400 mb-1">Category Name</label>
            <input type="text" id="edit-cat-name" class="w-full px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-200" value="${cat.name}" ${cat.isSystem ? 'disabled' : ''}/>
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-400 mb-1">Type</label>
            <select id="edit-cat-type" class="w-full px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-200" ${cat.isSystem ? 'disabled' : ''}>
              <option value="text" ${cat.type === 'text' ? 'selected' : ''}>Text (Discrete values)</option>
              <option value="multi" ${cat.type === 'multi' ? 'selected' : ''}>Multi-value (Multiple tags/people)</option>
              <option value="date" ${cat.type === 'date' ? 'selected' : ''}>Date</option>
              <option value="numeric" ${cat.type === 'numeric' ? 'selected' : ''}>Numeric (Currency/Cost)</option>
            </select>
          </div>
        </div>

        <!-- Values Section -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">Values & Keyword Aliases</span>
            <button id="btn-add-val" class="text-xs text-amber-400 hover:text-amber-300 font-medium">+ Add Value</button>
          </div>

          <div class="space-y-2 max-h-72 overflow-y-auto">
            ${cat.values.length === 0 ? '<p class="text-xs text-zinc-500 italic">No discrete values defined (freeform input).</p>' : ''}
            ${cat.values.map(val => `
              <div class="p-2.5 rounded bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-between text-xs">
                <div>
                  <span class="font-bold text-zinc-200">${val.name}</span>
                  <div class="text-[11px] text-zinc-400 mt-0.5">
                    Keywords: <span class="font-mono text-zinc-300">${val.keywords && val.keywords.length > 0 ? val.keywords.join(', ') : 'none'}</span>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button class="btn-edit-keywords text-[11px] text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-zinc-700" data-val-id="${val.id}">
                    Edit Keywords
                  </button>
                  <button class="btn-del-val text-xs text-zinc-500 hover:text-red-400 p-1" data-val-id="${val.id}">
                    ✕
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  bindCategoryDetailsEvents() {
    const cat = this.selectedCat;

    // Add Value
    const addValBtn = this.modalBody.querySelector('#btn-add-val');
    if (addValBtn) {
      addValBtn.addEventListener('click', () => {
        const valName = prompt(`Enter new value for ${cat.name}:`);
        if (valName && valName.trim()) {
          const kws = prompt(`Enter keyword aliases for "${valName}" (comma separated):`, valName.toLowerCase());
          const keywords = kws ? kws.split(',').map(k => k.trim()).filter(Boolean) : [valName.toLowerCase()];
          cat.addValue(new CategoryValue({ name: valName.trim(), keywords }));
          if (this.onSaveCategories) this.onSaveCategories(this.categories);
          this.renderCategoriesTab();
        }
      });
    }

    // Edit keywords
    this.modalBody.querySelectorAll('.btn-edit-keywords').forEach(btn => {
      btn.addEventListener('click', () => {
        const valId = btn.dataset.valId;
        const val = cat.values.find(v => v.id === valId);
        if (!val) return;
        const newKws = prompt(`Keyword aliases for "${val.name}" (comma-separated):`, val.keywords.join(', '));
        if (newKws !== null) {
          val.keywords = newKws.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
          if (this.onSaveCategories) this.onSaveCategories(this.categories);
          this.renderCategoriesTab();
        }
      });
    });

    // Delete value
    this.modalBody.querySelectorAll('.btn-del-val').forEach(btn => {
      btn.addEventListener('click', () => {
        const valId = btn.dataset.valId;
        cat.removeValue(valId);
        if (this.onSaveCategories) this.onSaveCategories(this.categories);
        this.renderCategoriesTab();
      });
    });
  }

  renderRulesTab() {
    this.modalBody.innerHTML = `
      <div class="h-full flex flex-col space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-sm font-bold text-zinc-200">Agenda Automatic Assignment Rules</h4>
            <p class="text-xs text-zinc-400">Rules evaluate conditions when items are created or modified to auto-assign categories</p>
          </div>
          <button id="btn-add-rule" class="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors shadow">
            + Add New Rule
          </button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          ${this.rules.length === 0 ? '<p class="text-zinc-500 text-sm italic">No assignment rules defined.</p>' : ''}
          ${this.rules.map(rule => `
            <div class="p-3.5 rounded-lg bg-zinc-800/70 border border-zinc-700/60 flex items-center justify-between text-xs">
              <div class="space-y-1">
                <div class="flex items-center space-x-2">
                  <span class="font-bold text-zinc-200 text-sm">${rule.name}</span>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-mono ${rule.enabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-700 text-zinc-400'}">
                    ${rule.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div class="text-zinc-400 font-mono text-[11px] flex items-center gap-1.5">
                  <span>IF:</span>
                  <span class="text-amber-300">${rule.conditionType === 'text_contains' ? `Text contains "${rule.conditionValue}"` : `${rule.conditionParam} is "${rule.conditionValue}"`}</span>
                  <span>➜ THEN ASSIGN:</span>
                  <span class="text-emerald-300 font-bold">${rule.targetCategory} = "${rule.targetValue}"</span>
                </div>
              </div>

              <div class="flex items-center space-x-2">
                <button class="btn-toggle-rule text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600" data-rule-id="${rule.id}">
                  ${rule.enabled ? 'Disable' : 'Enable'}
                </button>
                <button class="btn-delete-rule text-zinc-400 hover:text-red-400 p-1.5" data-rule-id="${rule.id}">
                  ✕
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Add Rule
    this.modalBody.querySelector('#btn-add-rule').addEventListener('click', () => {
      const name = prompt('Rule Name (e.g. Call Tasks, Budget Audit):');
      if (!name) return;
      const word = prompt('Text contains keyword to match (e.g. "meeting", "call", "urgent"):');
      if (!word) return;
      const targetCat = prompt('Target Category to assign (e.g. Type, Priority, Project):', 'Type');
      if (!targetCat) return;
      const targetVal = prompt(`Target Value to assign for ${targetCat} (e.g. Meeting, Call, High):`);
      if (!targetVal) return;

      const newRule = new Rule({
        name,
        conditionType: 'text_contains',
        conditionValue: word.trim(),
        targetCategory: targetCat.trim(),
        targetValue: targetVal.trim()
      });

      this.rules.push(newRule);
      if (this.onSaveRules) this.onSaveRules(this.rules);
      this.renderRulesTab();
    });

    // Toggle rule
    this.modalBody.querySelectorAll('.btn-toggle-rule').forEach(btn => {
      btn.addEventListener('click', () => {
        const ruleId = btn.dataset.ruleId;
        const rule = this.rules.find(r => r.id === ruleId);
        if (rule) {
          rule.enabled = !rule.enabled;
          if (this.onSaveRules) this.onSaveRules(this.rules);
          this.renderRulesTab();
        }
      });
    });

    // Delete rule
    this.modalBody.querySelectorAll('.btn-delete-rule').forEach(btn => {
      btn.addEventListener('click', () => {
        const ruleId = btn.dataset.ruleId;
        this.rules = this.rules.filter(r => r.id !== ruleId);
        if (this.onSaveRules) this.onSaveRules(this.rules);
        this.renderRulesTab();
      });
    });
  }
}
