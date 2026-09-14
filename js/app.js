/**
 * app.js - Main Application Controller for AgendaVault.
 * Unifies all of Lotus Agenda's PIM architecture with nvALT's Notational Velocity workflow,
 * enhanced with President's Planner (ppdoc.pdf) Templates, Macros, and Data Utilities.
 */

import { Item } from './models/Item.js';
import { Category, CategoryValue } from './models/Category.js';
import { Rule } from './models/Rule.js';
import { View } from './models/View.js';

import { NLPEngine } from './services/nlpEngine.js';
import { FilterEngine } from './services/filterEngine.js';
import { STFService } from './services/stfService.js';
import { StorageService } from './services/storageService.js';
import { TemplateService } from './services/templateService.js';
import { MacroEngine } from './services/macroEngine.js';
import { DataUtilities } from './services/dataUtilities.js';
import { formatLocalDate, addDays } from './utils/dateUtils.js';

import { Omnibar } from './components/Omnibar.js';
import { AgendaSectionsView } from './components/AgendaSectionsView.js';
import { AgendaTableView } from './components/AgendaTableView.js';
import { AgendaDatebookView } from './components/AgendaDatebookView.js';
import { AgendaExpenseView } from './components/AgendaExpenseView.js';
import { AgendaMatrixView } from './components/AgendaMatrixView.js';
import { NoteEditor } from './components/NoteEditor.js';
import { CategoryManagerModal } from './components/CategoryManagerModal.js';
import { MacroManagerModal } from './components/MacroManagerModal.js';
import { GenerativeUIModal } from './components/GenerativeUIModal.js';
import { TemplateManagerModal } from './components/TemplateManagerModal.js';
import { AmbiguousTriageModal } from './components/AmbiguousTriageModal.js';

export class App {
  constructor() {
    this.storage = new StorageService();
    this.filterEngine = new FilterEngine();
    this.templateService = new TemplateService();
    this.macroEngine = new MacroEngine(this);

    // State
    this.items = [];
    this.categories = [];
    this.rules = [];
    this.views = [];
    this.settings = {};

    this.activeView = null;
    this.selectedItem = null;
    this.searchQuery = '';
  }

  init() {
    // 1. Load data & settings
    const data = this.storage.loadData();
    this.items = data.items;
    this.categories = data.categories;
    this.rules = data.rules;
    this.views = data.views;
    this.settings = this.storage.loadSettings();

    // 2. Initialize NLP engine with category context
    this.nlpEngine = new NLPEngine({ categories: this.categories });

    // 3. Set Active View
    this.activeView = this.views.find(v => v.id === this.settings.activeViewId) || this.views[0];

    // 4. Apply initial theme and layout
    this.applyTheme(this.settings.theme);
    this.applyLayout(this.settings.layout);

    // 5. Initialize Components
    this.initOmnibar();
    this.initViews();
    this.initNoteEditor();
    this.initModals();
    this.initHeaderToolbar();
    this.initGlobalShortcuts();

    // 6. Initial Render & Triage Update
    this.renderCurrentView();
    this.updateTriageBadge();

    // Select first item if present
    if (this.items.length > 0) {
      this.selectItem(this.items[0].id);
    }
  }

  saveAll() {
    this.storage.saveData({
      items: this.items,
      categories: this.categories,
      rules: this.rules,
      views: this.views
    });
    if (this.noteEditor) {
      this.noteEditor.setAllItems(this.items);
    }
    this.updateTriageBadge();
  }

  updateTriageBadge() {
    const badge = document.getElementById('header-triage-badge');
    if (!badge) return;
    const count = DataUtilities.findAmbiguousItems(this.items).length;
    badge.textContent = count;
    if (count > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  triggerScratchPadPrompt(defaultText = '') {
    const text = prompt("President's Planner Scratch Pad (DWIM):\nEnter freeform note, phone call, appointment, promise, or expense:", defaultText);
    if (text && text.trim()) {
      const item = DataUtilities.classifyScratchPadText(text.trim(), this.nlpEngine);
      if (item) {
        this.addItemWithRules(item);
        this.selectItem(item.id);
        const type = item.getCategory('Type') || 'Task';
        alert(`⚡ Scratch Pad parsed "${item.text}" as [${type}] with date ${item.getCategory('When') || 'None'}`);
      }
    }
  }

  // --- Theme & Layout Management ---
  applyTheme(theme) {
    document.body.classList.remove('theme-retro-dos', 'theme-modern-dark', 'theme-modern-light');
    if (theme === 'retro-dos') {
      document.body.classList.add('theme-retro-dos');
    } else if (theme === 'modern-light') {
      document.body.classList.add('theme-modern-light');
    } else {
      document.body.classList.add('theme-modern-dark');
    }
    this.settings.theme = theme;
    this.storage.saveSettings(this.settings);

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = theme;
  }

  applyLayout(layout) {
    const mainContainer = document.getElementById('main-workspace');
    const viewPane = document.getElementById('view-pane');
    const editorPaneContainer = document.getElementById('editor-pane-container');

    if (!mainContainer || !viewPane || !editorPaneContainer) return;

    this.settings.layout = layout;
    this.storage.saveSettings(this.settings);

    if (layout === 'nvalt-vertical') {
      mainContainer.className = 'flex-1 flex flex-col min-h-0 p-3 gap-3 overflow-hidden';
      viewPane.className = 'h-1/2 overflow-y-auto flex flex-col min-h-0';
      editorPaneContainer.className = 'h-1/2 flex flex-col min-h-0';
      editorPaneContainer.classList.remove('hidden');
    } else if (layout === 'nvalt-horizontal') {
      mainContainer.className = 'flex-1 flex flex-row min-h-0 p-3 gap-3 overflow-hidden';
      viewPane.className = 'w-1/2 overflow-y-auto flex flex-col min-h-0';
      editorPaneContainer.className = 'w-1/2 flex flex-col min-h-0';
      editorPaneContainer.classList.remove('hidden');
    } else if (layout === 'editor-focus') {
      mainContainer.className = 'flex-1 flex flex-col min-h-0 p-3 gap-3 overflow-hidden';
      viewPane.classList.add('hidden');
      editorPaneContainer.className = 'flex-1 flex flex-col min-h-0';
      editorPaneContainer.classList.remove('hidden');
    } else {
      // 'agenda-full'
      mainContainer.className = 'flex-1 flex flex-row min-h-0 p-3 gap-3 overflow-hidden';
      viewPane.className = 'w-7/12 overflow-y-auto flex flex-col min-h-0';
      editorPaneContainer.className = 'w-5/12 flex flex-col min-h-0';
      editorPaneContainer.classList.remove('hidden');
      viewPane.classList.remove('hidden');
    }

    const layoutSelect = document.getElementById('layout-select');
    if (layoutSelect) layoutSelect.value = layout;
  }

  // --- Omnibar Initialization ---
  initOmnibar() {
    const container = document.getElementById('omnibar-mount');
    this.omnibar = new Omnibar({
      container,
      nlpEngine: this.nlpEngine,
      onSearch: (query) => {
        const trimmed = query.trim();
        const lower = trimmed.toLowerCase();

        // Omnibar template command shortcut (/template or /t)
        if (lower.startsWith('/template') || lower.startsWith('/t ') || lower === '/t') {
          const tplName = trimmed.replace(/^\/(?:template|t)\s*/i, '').trim();
          if (tplName) {
            const found = this.templateService.getItemTemplateById(tplName);
            if (found) {
              this.templateModal.selectedItemTemplate = found;
            }
          }
          this.templateModal.show('items');
          this.omnibar.clear();
          return;
        }

        // Omnibar macro shortcut (/macro or /m)
        if (lower.startsWith('/macro') || lower.startsWith('/m ') || lower === '/m') {
          const script = trimmed.replace(/^\/(?:macro|m)\s*/i, '').trim();
          this.macroModal.show(script ? 'cli' : 'registry');
          if (script) {
            const cliInput = document.getElementById('macro-cli-input');
            if (cliInput) cliInput.value = script;
          }
          this.omnibar.clear();
          return;
        }

        // Omnibar triage shortcut (/triage or /?)
        if (lower === '/triage' || lower === '/?') {
          this.triageModal.show();
          this.omnibar.clear();
          return;
        }

        this.searchQuery = query;
        this.renderCurrentView();
      },
      onCreateItem: (rawText, parsed) => {
        this.handleCreateItem(rawText, parsed);
      },
      onSelectItem: (forceSelect = false) => {
        const query = (this.searchQuery || '').trim().toLowerCase();
        const filtered = this.getFilteredItems();
        if (filtered.length === 0) return false;

        // If exact title match exists, open and focus it
        const exactMatch = filtered.find(i => i.text.toLowerCase() === query);
        if (exactMatch) {
          this.selectItem(exactMatch.id);
          this.noteEditor.focus();
          return true;
        }

        // If user actively navigated the list using arrow keys
        if (forceSelect) {
          this.selectItem(filtered[0].id);
          this.noteEditor.focus();
          return true;
        }

        return false;
      },
      onNavigateList: (dir) => {
        const filtered = this.getFilteredItems();
        if (filtered.length === 0) return;
        let index = filtered.findIndex(i => i.id === (this.selectedItem ? this.selectedItem.id : null));
        if (dir === 'down') {
          index = index < filtered.length - 1 ? index + 1 : 0;
        } else {
          index = index > 0 ? index - 1 : filtered.length - 1;
        }
        this.selectItem(filtered[index].id);
      }
    });
  }

  // --- Views Initialization ---
  initViews() {
    this.sectionsView = new AgendaSectionsView({
      container: document.getElementById('view-content-mount'),
      onSelectItem: (id) => this.selectItem(id),
      onToggleDone: (id) => this.toggleDone(id),
      onDeleteItem: (id) => this.deleteItem(id),
      onQuickAdd: (catName, sectionTitle) => {
        const text = prompt(`New item for ${catName} "${sectionTitle}":`);
        if (text && text.trim()) {
          const item = new Item({ text: text.trim() });
          if (catName === 'When') {
            const today = new Date();
            if (sectionTitle === 'Due Today') item.setCategory('When', formatLocalDate(today));
            else if (sectionTitle === 'Due Tomorrow') {
              item.setCategory('When', formatLocalDate(addDays(today, 1)));
            }
          } else {
            item.setCategory(catName, sectionTitle);
          }
          this.addItemWithRules(item);
        }
      }
    });

    this.tableView = new AgendaTableView({
      container: document.getElementById('view-content-mount'),
      onSelectItem: (id) => this.selectItem(id),
      onToggleDone: (id) => this.toggleDone(id),
      onDeleteItem: (id) => this.deleteItem(id),
      onUpdateCategory: (id, cat, val) => {
        const item = this.items.find(i => i.id === id);
        if (item) {
          item.setCategory(cat, val);
          this.saveAll();
          this.renderCurrentView();
        }
      }
    });

    this.datebookView = new AgendaDatebookView({
      container: document.getElementById('view-content-mount'),
      onSelectItem: (id) => this.selectItem(id),
      onToggleDone: (id) => this.toggleDone(id)
    });

    this.expenseView = new AgendaExpenseView({
      container: document.getElementById('view-content-mount'),
      onSelectItem: (id) => this.selectItem(id),
      onToggleDone: (id) => this.toggleDone(id)
    });

    this.matrixView = new AgendaMatrixView({
      container: document.getElementById('view-content-mount'),
      onSelectItem: (id) => this.selectItem(id)
    });
  }

  // --- Note Editor Initialization ---
  initNoteEditor() {
    this.noteEditor = new NoteEditor({
      container: document.getElementById('editor-pane-container'),
      categories: this.categories,
      allItems: this.items,
      onUpdateItem: (item) => {
        // Apply assignment rules when item changes
        this.applyRulesToItem(item);
        this.saveAll();
        this.renderCurrentView();
      },
      onNavigateWikiLink: (targetTitle) => {
        const lower = targetTitle.toLowerCase();
        let target = this.items.find(i => i.text.toLowerCase() === lower);
        if (!target) {
          target = this.items.find(i => i.text.toLowerCase().includes(lower));
        }
        if (!target) {
          target = this.items.find(i => {
            const p = i.getCategory('Project');
            const ppl = i.getCategory('People');
            return (typeof p === 'string' && p.toLowerCase() === lower) ||
                   (Array.isArray(ppl) && ppl.some(person => person.toLowerCase() === lower));
          });
        }
        if (!target) {
          if (confirm(`Create new note for "[[${targetTitle}]]"?`)) {
            target = new Item({ text: targetTitle });
            this.addItemWithRules(target);
          }
        }
        if (target) {
          this.selectItem(target.id);
        }
      }
    });
  }

  // --- Modals Initialization ---
  initModals() {
    this.categoryModal = new CategoryManagerModal({
      container: document.getElementById('modal-category-mount'),
      categories: this.categories,
      rules: this.rules,
      onSaveCategories: (cats) => {
        this.categories = cats;
        this.nlpEngine = new NLPEngine({ categories: this.categories });
        this.noteEditor.setCategories(this.categories);
        this.saveAll();
        this.renderCurrentView();
      },
      onSaveRules: (rls) => {
        this.rules = rls;
        this.saveAll();
      }
    });

    this.macroModal = new MacroManagerModal({
      container: document.getElementById('modal-macro-mount'),
      macroEngine: this.macroEngine,
      onRunMacro: (macroName) => this.runMacro(macroName)
    });

    this.templateModal = new TemplateManagerModal({
      container: document.getElementById('modal-template-mount'),
      templateService: this.templateService,
      onApplyWorkspaceTemplate: (id, mode) => {
        const result = this.templateService.applyWorkspaceTemplate(id, this, mode);
        this.updateTriageBadge();
        alert(`Loaded template "${result.templateName}" with ${result.itemCount} items.`);
      },
      onInsertItemTemplate: (tplId, vars) => {
        const item = this.templateService.instantiateItemTemplate(tplId, vars);
        this.addItemWithRules(item);
        this.selectItem(item.id);
      }
    });

    this.triageModal = new AmbiguousTriageModal({
      container: document.getElementById('modal-triage-mount'),
      getItems: () => this.items,
      getCategories: () => this.categories,
      onResolveItem: (item) => {
        this.applyRulesToItem(item);
        this.saveAll();
        this.renderCurrentView();
        this.updateTriageBadge();
      },
      onTriageCompleted: () => {
        this.saveAll();
        this.renderCurrentView();
        this.updateTriageBadge();
      }
    });

    this.genModal = new GenerativeUIModal({
      container: document.getElementById('modal-gen-mount'),
      allItems: this.items,
      categories: this.categories,
      views: this.views,
      onBatchAddItems: (newItems) => {
        newItems.forEach(i => this.addItemWithRules(i));
        this.renderCurrentView();
        if (newItems.length > 0) this.selectItem(newItems[0].id);
      },
      onAddView: (newView) => {
        this.views.push(newView);
        this.saveAll();
        this.renderViewSwitcher();
        this.switchView(newView.id);
      }
    });
  }

  // --- Header Toolbar ---
  initHeaderToolbar() {
    this.renderViewSwitcher();
    this.updateTriageBadge();

    // New Item button
    document.getElementById('btn-new-item').addEventListener('click', () => {
      this.omnibar.focus();
    });

    // Scratch Pad DWIM button
    document.getElementById('btn-scratch-pad')?.addEventListener('click', () => {
      this.triggerScratchPadPrompt();
    });

    // Theme select
    const themeSelect = document.getElementById('theme-select');
    themeSelect.value = this.settings.theme;
    themeSelect.addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
    });

    // Layout select
    const layoutSelect = document.getElementById('layout-select');
    layoutSelect.value = this.settings.layout;
    layoutSelect.addEventListener('change', (e) => {
      this.applyLayout(e.target.value);
    });

    // Templates button
    document.getElementById('btn-open-templates')?.addEventListener('click', () => {
      this.templateModal.show();
    });

    // Triage button
    document.getElementById('btn-open-triage')?.addEventListener('click', () => {
      this.triageModal.show();
    });

    // Categories button
    document.getElementById('btn-open-categories').addEventListener('click', () => {
      this.categoryModal.show();
    });

    // Macros button
    document.getElementById('btn-open-macros').addEventListener('click', () => {
      this.macroModal.show();
    });

    // AI / Generative UI button
    document.getElementById('btn-open-gen-ui').addEventListener('click', () => {
      this.genModal.show();
    });

    // 1-Click Vault Switcher controls
    const vaultSelect = document.getElementById('vault-select');
    if (vaultSelect) {
      vaultSelect.value = this.settings.activeVault || 'demo';
      vaultSelect.addEventListener('change', (e) => {
        this.switchVault(e.target.value);
      });
    }

    const updateVaultBadges = () => {
      const activeVault = this.settings.activeVault || 'demo';
      const badgeDemo = document.getElementById('badge-demo-vault');
      const badgePersonal = document.getElementById('badge-personal-vault');
      if (badgeDemo) badgeDemo.classList.toggle('hidden', activeVault !== 'demo');
      if (badgePersonal) badgePersonal.classList.toggle('hidden', activeVault !== 'personal');
      if (vaultSelect) vaultSelect.value = activeVault;
    };
    updateVaultBadges();

    document.getElementById('btn-switch-demo-vault')?.addEventListener('click', () => {
      this.switchVault('demo');
    });

    document.getElementById('btn-switch-personal-vault')?.addEventListener('click', () => {
      this.switchVault('personal');
    });

    document.getElementById('btn-reset-personal-preset')?.addEventListener('click', () => {
      if (confirm('Reset Personal Sample Vault to pristine preset data?')) {
        this.resetVaultToPreset('personal');
      }
    });

    // Data Transfer (Import / Export) buttons
    document.getElementById('btn-export-stf').addEventListener('click', () => {
      const stf = STFService.exportToSTF(this.items, this.categories);
      this.downloadFile(stf, 'agenda_vault.stf', 'text/plain');
    });

    document.getElementById('btn-export-json').addEventListener('click', () => {
      const json = STFService.exportToJSON({
        items: this.items,
        categories: this.categories,
        rules: this.rules,
        views: this.views
      });
      this.downloadFile(json, 'agenda_vault.json', 'application/json');
    });

    document.getElementById('btn-export-markdown').addEventListener('click', () => {
      const md = STFService.exportToMarkdown(this.items);
      this.downloadFile(md, 'agenda_vault_notes.md', 'text/markdown');
    });

    // File input for import
    const fileInput = document.getElementById('file-import-input');
    document.getElementById('btn-import-file').addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        if (file.name.endsWith('.stf')) {
          const parsed = STFService.importFromSTF(content);
          this.items.push(...parsed.items);
          this.saveAll();
          this.renderCurrentView();
          alert(`Imported ${parsed.items.length} items from Agenda STF file.`);
        } else if (file.name.endsWith('.json')) {
          const data = STFService.importFromJSON(content);
          if (data.items) this.items = data.items.map(i => Item.fromJSON(i));
          if (data.categories) this.categories = data.categories.map(c => Category.fromJSON(c));
          if (data.rules) this.rules = data.rules.map(r => Rule.fromJSON(r));
          if (data.views) this.views = data.views.map(v => View.fromJSON(v));
          this.nlpEngine = new NLPEngine({ categories: this.categories });
          this.noteEditor.setCategories(this.categories);
          this.noteEditor.setAllItems(this.items);
          this.saveAll();
          this.renderViewSwitcher();
          this.renderCurrentView();
          alert('Imported workspace successfully from JSON.');
        }
      };
      reader.readAsText(file);
    });
  }

  // --- Vault Switching & Presets ---
  switchVault(targetVault, skipSaveCurrent = false) {
    if (!skipSaveCurrent) {
      this.saveAll();
    }
    const data = this.storage.switchVault(targetVault);
    this.items = data.items;
    this.categories = data.categories;
    this.rules = data.rules;
    this.views = data.views;
    this.settings = this.storage.loadSettings();
    this.nlpEngine = new NLPEngine({ categories: this.categories });

    this.activeView = this.views.find(v => v.id === this.settings.activeViewId) || this.views[0];

    if (this.noteEditor) {
      this.noteEditor.setCategories(this.categories);
      this.noteEditor.setAllItems(this.items);
    }

    if (this.categoryModal) {
      this.categoryModal.categories = this.categories;
      this.categoryModal.rules = this.rules;
    }

    if (this.genModal) {
      this.genModal.allItems = this.items;
      this.genModal.categories = this.categories;
      this.genModal.views = this.views;
    }

    const vaultSelect = document.getElementById('vault-select');
    if (vaultSelect) vaultSelect.value = targetVault;
    const badgeDemo = document.getElementById('badge-demo-vault');
    const badgePersonal = document.getElementById('badge-personal-vault');
    if (badgeDemo) badgeDemo.classList.toggle('hidden', targetVault !== 'demo');
    if (badgePersonal) badgePersonal.classList.toggle('hidden', targetVault !== 'personal');

    this.renderViewSwitcher();
    this.renderCurrentView();
    this.updateTriageBadge();

    if (this.items.length > 0) {
      this.selectItem(this.items[0].id);
    }
  }

  resetVaultToPreset(targetVault = 'personal') {
    const data = this.storage.resetVaultToPreset(targetVault);
    this.switchVault(targetVault, true);
    alert(`Reset ${targetVault === 'personal' ? 'Personal Sample Vault' : 'Demo Vault'} preset with ${data.items.length} items.`);
  }

  renderViewSwitcher() {
    const container = document.getElementById('view-tabs-mount');
    if (!container) return;

    container.innerHTML = this.views.map(v => `
      <button
        class="view-tab-btn px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${this.activeView && this.activeView.id === v.id ? 'bg-zinc-700 text-amber-300 font-bold border border-zinc-600' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}"
        data-view-id="${v.id}"
      >
        <span>${this.getViewIcon(v.type)}</span>
        <span>${v.name}</span>
      </button>
    `).join('');

    container.querySelectorAll('.view-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchView(btn.dataset.viewId);
      });
    });
  }

  getViewIcon(type) {
    switch (type) {
      case 'sections': return '📑';
      case 'table': return '📊';
      case 'datebook': return '📅';
      case 'expense': return '💰';
      case 'matrix': return '▦';
      default: return '📄';
    }
  }

  switchView(viewId) {
    const view = this.views.find(v => v.id === viewId);
    if (!view) return;
    this.activeView = view;
    this.settings.activeViewId = view.id;
    this.storage.saveSettings(this.settings);
    this.renderViewSwitcher();
    this.renderCurrentView();
  }

  cycleView(direction = 1) {
    const currentIndex = this.views.findIndex(v => v.id === this.activeView.id);
    let nextIndex = (currentIndex + direction) % this.views.length;
    if (nextIndex < 0) nextIndex = this.views.length - 1;
    this.switchView(this.views[nextIndex].id);
  }

  // --- Filtering and Rendering ---
  getFilteredItems() {
    return this.filterEngine.filterItems(
      this.items,
      this.activeView ? this.activeView.filterExpression : '',
      this.searchQuery
    );
  }

  renderCurrentView() {
    if (!this.activeView) return;

    const filtered = this.getFilteredItems();

    // Update active view header description
    const viewTitleEl = document.getElementById('active-view-title');
    const viewFilterEl = document.getElementById('active-view-filter');
    if (viewTitleEl) viewTitleEl.textContent = this.activeView.name;
    if (viewFilterEl) {
      viewFilterEl.textContent = this.activeView.filterExpression ? `Filter: ${this.activeView.filterExpression}` : 'Showing all view items';
    }

    // Render corresponding view component
    switch (this.activeView.type) {
      case 'sections':
        this.sectionsView.render(filtered, this.activeView, this.categories);
        break;
      case 'table':
        this.tableView.render(filtered, this.activeView, this.categories);
        break;
      case 'datebook':
        this.datebookView.render(filtered, this.activeView);
        break;
      case 'expense':
        this.expenseView.render(filtered, this.activeView);
        break;
      case 'matrix':
        this.matrixView.render(filtered, this.activeView, this.categories);
        break;
      default:
        this.sectionsView.render(filtered, this.activeView, this.categories);
    }
  }

  // --- Item CRUD & Rules ---
  handleCreateItem(rawText, parsed) {
    const nlp = parsed || this.nlpEngine.parse(rawText);

    const item = new Item({
      text: rawText,
      categories: { ...nlp.categoryAssignments },
      cost: nlp.cost
    });

    this.addItemWithRules(item);
    this.selectItem(item.id);
  }

  addItemWithRules(item) {
    this.applyRulesToItem(item);
    this.items.unshift(item);
    this.saveAll();
    this.renderCurrentView();
  }

  applyRulesToItem(item) {
    const sortedRules = [...this.rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    sortedRules.forEach(rule => {
      rule.apply(item);
    });
  }

  selectItem(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;
    this.selectedItem = item;
    this.noteEditor.loadItem(item);

    if (this.sectionsView) this.sectionsView.selectedItemId = itemId;
    if (this.tableView) this.tableView.selectedItemId = itemId;
  }

  toggleDone(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;
    item.toggleDone();
    this.saveAll();
    this.renderCurrentView();
    if (this.selectedItem && this.selectedItem.id === itemId) {
      this.noteEditor.loadItem(item);
    }
  }

  deleteItem(itemId) {
    this.items = this.items.filter(i => i.id !== itemId);
    if (this.selectedItem && this.selectedItem.id === itemId) {
      this.selectedItem = this.items[0] || null;
      this.noteEditor.loadItem(this.selectedItem);
    }
    this.saveAll();
    this.renderCurrentView();
  }

  // --- Macro Execution ---
  runMacro(macroNameOrScript) {
    switch (macroNameOrScript) {
      case 'archiveDone':
        this.items.forEach(i => {
          if (i.done) i.setCategory('Status', 'Archived');
        });
        alert('Archived all completed items.');
        break;

      case 'reapplyRules':
        let modified = 0;
        const sorted = [...this.rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
        this.items.forEach(item => {
          sorted.forEach(rule => {
            if (rule.apply(item)) modified++;
          });
        });
        alert(`Evaluated assignment rules across all items. Updated ${modified} attributes.`);
        break;

      case 'bumpOverdue':
        const res = DataUtilities.rolloverOverdueItems(this.items);
        alert(`Rescheduled ${res.count} overdue tasks to Today.`);
        break;

      case 'purgeCompleted':
        if (confirm('Permanently delete all completed items? This cannot be undone.')) {
          this.items = DataUtilities.purgeCompletedItems(this.items);
          alert('Purged completed items.');
        }
        break;

      default:
        // Execute via MacroEngine
        const result = this.macroEngine.execute(macroNameOrScript);
        if (result.log && result.log.length > 0) {
          alert(result.log.join('\n'));
        }
        break;
    }

    this.saveAll();
    this.renderCurrentView();
  }

  // --- Global Keyboard Shortcuts ---
  initGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      // F6: Open Category & Rule Manager
      if (e.key === 'F6') {
        e.preventDefault();
        this.categoryModal.show();
      }
      // F7: Ambiguous Statements Triage
      else if (e.key === 'F7') {
        e.preventDefault();
        this.triageModal.show();
      }
      // F8: Switch views
      else if (e.key === 'F8') {
        e.preventDefault();
        this.cycleView(1);
      }
      // F9: Templates Manager
      else if (e.key === 'F9') {
        e.preventDefault();
        this.templateModal.show();
      }
      // Alt-N: Next View
      else if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.cycleView(1);
      }
      // Alt-P: Previous View
      else if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        this.cycleView(-1);
      }
      // Alt-F3: Macro Manager
      else if (e.altKey && e.key === 'F3') {
        e.preventDefault();
        this.macroModal.show();
      }
      // Alt+1 .. Alt+5: Macro Hotkeys
      else if (e.altKey && e.key >= '1' && e.key <= '5') {
        const shortcut = `Alt+${e.key}`;
        const found = this.macroEngine.getMacroByShortcut(shortcut);
        if (found) {
          e.preventDefault();
          this.macroEngine.execute(found.script);
        }
      }
    });
  }

  downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
