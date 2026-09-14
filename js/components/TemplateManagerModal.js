/**
 * TemplateManagerModal.js - Reusable Template Center for AgendaVault.
 * Supports:
 * 1. Applying Workspace Templates (President's Planner, GTD, Software Engineering)
 * 2. Instantiating Item & Note Boilerplates (Meeting Note, Delegated Follow-Up, Expense Voucher, Bug Report)
 */

export class TemplateManagerModal {
  constructor({
    container,
    templateService,
    onApplyWorkspaceTemplate,
    onInsertItemTemplate
  }) {
    this.container = container;
    this.templateService = templateService;
    this.onApplyWorkspaceTemplate = onApplyWorkspaceTemplate;
    this.onInsertItemTemplate = onInsertItemTemplate;

    this.activeTab = 'items'; // 'items' or 'workspaces'
    this.selectedItemTemplate = null;

    this.render();
  }

  show(defaultTab = 'items') {
    this.activeTab = defaultTab;
    this.updateTabUI();
    this.modalEl.classList.remove('hidden');
    if (this.activeTab === 'items' && !this.selectedItemTemplate) {
      const templates = this.templateService.getItemTemplates();
      if (templates.length > 0) this.selectItemTemplate(templates[0].id);
    }
  }

  hide() {
    this.modalEl.classList.add('hidden');
  }

  render() {
    this.container.innerHTML = `
      <div id="template-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
        <div class="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden text-zinc-100">
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
            <div class="flex items-center space-x-3">
              <div class="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
              </div>
              <div>
                <h3 class="font-bold text-base text-zinc-100 flex items-center gap-2">
                  Lotus Agenda & President's Planner Templates
                  <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">ppdoc.pdf</span>
                </h3>
                <p class="text-xs text-zinc-400">Predefined application workspaces and structured note boilerplates</p>
              </div>
            </div>
            <button id="template-modal-close" class="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 text-lg">✕</button>
          </div>

          <!-- Navigation Tabs -->
          <div class="px-6 pt-3 border-b border-zinc-800 bg-zinc-900 flex space-x-6 text-xs font-semibold">
            <button id="tab-item-templates" class="tab-btn pb-2.5 border-b-2 border-amber-500 text-amber-400 flex items-center gap-1.5">
              <span>📝 Item & Note Boilerplates</span>
            </button>
            <button id="tab-workspace-templates" class="tab-btn pb-2.5 border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5">
              <span>🏛️ Workspace Databases (.AG)</span>
            </button>
          </div>

          <!-- Modal Body Content -->
          <div id="template-body-mount" class="flex-1 overflow-y-auto p-6">
            <!-- Dynamically populated depending on active tab -->
          </div>
        </div>
      </div>
    `;

    this.modalEl = this.container.querySelector('#template-modal');
    this.bodyMount = this.container.querySelector('#template-body-mount');
    this.tabItemsBtn = this.container.querySelector('#tab-item-templates');
    this.tabWorkspaceBtn = this.container.querySelector('#tab-workspace-templates');

    this.bindEvents();
    this.renderTabContent();
  }

  bindEvents() {
    this.container.querySelector('#template-modal-close').addEventListener('click', () => this.hide());

    this.tabItemsBtn.addEventListener('click', () => {
      this.activeTab = 'items';
      this.updateTabUI();
      this.renderTabContent();
    });

    this.tabWorkspaceBtn.addEventListener('click', () => {
      this.activeTab = 'workspaces';
      this.updateTabUI();
      this.renderTabContent();
    });
  }

  updateTabUI() {
    if (this.activeTab === 'items') {
      this.tabItemsBtn.className = 'tab-btn pb-2.5 border-b-2 border-amber-500 text-amber-400 flex items-center gap-1.5';
      this.tabWorkspaceBtn.className = 'tab-btn pb-2.5 border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5';
    } else {
      this.tabItemsBtn.className = 'tab-btn pb-2.5 border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5';
      this.tabWorkspaceBtn.className = 'tab-btn pb-2.5 border-b-2 border-amber-500 text-amber-400 flex items-center gap-1.5';
    }
  }

  renderTabContent() {
    if (this.activeTab === 'items') {
      this.renderItemTemplatesUI();
    } else {
      this.renderWorkspaceTemplatesUI();
    }
  }

  renderItemTemplatesUI() {
    const templates = this.templateService.getItemTemplates();
    const active = this.selectedItemTemplate || templates[0];

    this.bodyMount.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
        <!-- Left Column: Template List -->
        <div class="md:col-span-4 space-y-2 border-r border-zinc-800 pr-4">
          <span class="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">Available Boilerplates</span>
          ${templates.map(t => `
            <button
              class="tpl-select-btn w-full text-left p-3 rounded-lg border transition-colors ${active && active.id === t.id ? 'bg-amber-500/10 border-amber-500/60 text-amber-300' : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'}"
              data-id="${t.id}"
            >
              <div class="font-bold text-xs">${t.name}</div>
              <p class="text-[11px] text-zinc-400 mt-1 line-clamp-2">${t.description}</p>
            </button>
          `).join('')}
        </div>

        <!-- Right Column: Variable Form & Preview -->
        <div class="md:col-span-8 flex flex-col space-y-4">
          <div class="p-4 rounded-lg bg-zinc-800/60 border border-zinc-700">
            <h4 class="font-bold text-sm text-zinc-100">${active.name}</h4>
            <p class="text-xs text-zinc-400 mt-0.5">${active.description}</p>

            <!-- Variable Input Fields -->
            <div class="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
              <div>
                <label class="block text-zinc-400 mb-1">Title / Subject</label>
                <input type="text" id="tpl-var-title" class="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-zinc-100" value="Architecture Review" />
              </div>
              <div>
                <label class="block text-zinc-400 mb-1">Date (When)</label>
                <input type="date" id="tpl-var-date" class="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-zinc-100" value="${new Date().toISOString().split('T')[0]}" />
              </div>
              <div>
                <label class="block text-zinc-400 mb-1">Person / Contact</label>
                <input type="text" id="tpl-var-person" class="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-zinc-100" value="Sarah" />
              </div>
              <div>
                <label class="block text-zinc-400 mb-1">Project</label>
                <input type="text" id="tpl-var-project" class="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-zinc-100" value="Website Redesign" />
              </div>
              ${active.variables.includes('cost') ? `
                <div>
                  <label class="block text-zinc-400 mb-1">Cost ($)</label>
                  <input type="number" id="tpl-var-cost" class="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-zinc-100" value="1250" />
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Preview & Action -->
          <div class="flex-1 flex flex-col min-h-0 bg-zinc-950/80 rounded-lg border border-zinc-800 p-3">
            <span class="text-[11px] font-mono text-zinc-400 mb-2">Note Template Preview:</span>
            <pre id="tpl-preview-text" class="flex-1 overflow-y-auto text-[11px] font-mono text-zinc-300 whitespace-pre-wrap select-text"></pre>
          </div>

          <div class="flex justify-end space-x-3 pt-2">
            <button id="btn-insert-template" class="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow transition-colors flex items-center gap-1.5">
              <span>+ Insert Template into Workspace</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind selection clicks
    this.bodyMount.querySelectorAll('.tpl-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectItemTemplate(btn.dataset.id);
      });
    });

    const updatePreview = () => {
      const vars = {
        title: this.bodyMount.querySelector('#tpl-var-title')?.value || '',
        date: this.bodyMount.querySelector('#tpl-var-date')?.value || '',
        person: this.bodyMount.querySelector('#tpl-var-person')?.value || '',
        project: this.bodyMount.querySelector('#tpl-var-project')?.value || '',
        cost: this.bodyMount.querySelector('#tpl-var-cost')?.value || '0'
      };
      const expanded = active.expand(vars);
      const previewEl = this.bodyMount.querySelector('#tpl-preview-text');
      if (previewEl) {
        previewEl.textContent = `[Headline: "${expanded.text}"]\nCategories: ${JSON.stringify(expanded.categories, null, 2)}\n\n${expanded.note}`;
      }
    };

    this.bodyMount.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', updatePreview);
    });
    updatePreview();

    this.bodyMount.querySelector('#btn-insert-template').addEventListener('click', () => {
      const vars = {
        title: this.bodyMount.querySelector('#tpl-var-title')?.value || '',
        date: this.bodyMount.querySelector('#tpl-var-date')?.value || '',
        person: this.bodyMount.querySelector('#tpl-var-person')?.value || '',
        project: this.bodyMount.querySelector('#tpl-var-project')?.value || '',
        cost: this.bodyMount.querySelector('#tpl-var-cost')?.value || '0'
      };
      if (this.onInsertItemTemplate) {
        this.onInsertItemTemplate(active.id, vars);
      }
      this.hide();
    });
  }

  selectItemTemplate(id) {
    this.selectedItemTemplate = this.templateService.getItemTemplateById(id);
    this.renderItemTemplatesUI();
  }

  renderWorkspaceTemplatesUI() {
    const templates = this.templateService.getWorkspaceTemplates();

    this.bodyMount.innerHTML = `
      <div class="space-y-6">
        <div>
          <h4 class="font-bold text-sm text-zinc-100">Pre-configured Agenda Applications (.AG)</h4>
          <p class="text-xs text-zinc-400 mt-0.5">Switch your workspace to a dedicated information architecture or merge categories and views.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${templates.map(t => `
            <div class="p-5 rounded-xl bg-zinc-800/80 border border-zinc-700/80 hover:border-amber-500/60 flex flex-col justify-between space-y-4 transition-colors">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">${t.badge}</span>
                  <span class="text-[11px] font-mono text-zinc-500">${t.views.length} Views</span>
                </div>
                <h5 class="font-bold text-sm text-zinc-100">${t.name}</h5>
                <p class="text-xs text-zinc-400 leading-relaxed">${t.description}</p>
                <div class="pt-2 text-[11px] text-zinc-400 font-mono space-y-1">
                  <div>📂 ${t.categories.length} Categories</div>
                  <div>⚡ ${t.rules.length} Assignment Rules</div>
                  <div>📄 ${t.starterItems.length} Starter Items</div>
                </div>
              </div>

              <div class="flex space-x-2 pt-2 border-t border-zinc-700/60">
                <button
                  class="btn-apply-ws flex-1 py-1.5 px-3 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors"
                  data-id="${t.id}"
                  data-mode="replace"
                >
                  Load Template
                </button>
                <button
                  class="btn-apply-ws py-1.5 px-3 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium text-xs transition-colors"
                  data-id="${t.id}"
                  data-mode="merge"
                  title="Merge categories and views without wiping current items"
                >
                  Merge
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.bodyMount.querySelectorAll('.btn-apply-ws').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const mode = btn.dataset.mode;
        const tpl = this.templateService.getWorkspaceTemplateById(id);
        if (mode === 'replace') {
          if (!confirm(`Warning: Loading "${tpl.name}" in Replace mode will reset your current workspace to this template's categories, views, and starter items. Proceed?`)) {
            return;
          }
        }
        if (this.onApplyWorkspaceTemplate) {
          this.onApplyWorkspaceTemplate(id, mode);
        }
        this.hide();
      });
    });
  }
}
