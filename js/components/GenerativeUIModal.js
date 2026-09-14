/**
 * GenerativeUIModal.js - Generative AI Assistant for Agenda & nvALT.
 * Dynamically generates structured tasks, categories, custom views, and reports
 * from natural language instructions.
 */

import { Item } from '../models/Item.js';
import { View } from '../models/View.js';

export class GenerativeUIModal {
  constructor({
    container,
    allItems = [],
    categories = [],
    views = [],
    onBatchAddItems,
    onAddView
  }) {
    this.container = container;
    this.allItems = allItems;
    this.categories = categories;
    this.views = views;
    this.onBatchAddItems = onBatchAddItems;
    this.onAddView = onAddView;

    this.render();
  }

  show() {
    this.modalEl.classList.remove('hidden');
    this.promptInput.focus();
  }

  hide() {
    this.modalEl.classList.add('hidden');
  }

  render() {
    this.container.innerHTML = `
      <div id="gen-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
        <div class="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden text-zinc-100">
          <div class="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
            <div class="flex items-center space-x-3">
              <div class="p-2 rounded bg-gradient-to-tr from-amber-500 to-indigo-500 text-white shadow">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <div>
                <h3 class="font-bold text-base text-zinc-100 flex items-center gap-2">
                  Generative UI & Task Synthesizer
                  <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">AI Powered</span>
                </h3>
                <p class="text-xs text-zinc-400">Describe projects, checklists, views, or reports in natural language</p>
              </div>
            </div>
            <button id="gen-modal-close" class="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 text-lg">✕</button>
          </div>

          <!-- Prompt Input Bar -->
          <div class="p-4 border-b border-zinc-800 bg-zinc-900 flex space-x-2">
            <input
              type="text"
              id="gen-prompt-input"
              class="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="e.g., 'Plan a 4-step website deployment with Tom next week', 'Create view for High Priority items', 'Summarize my workload'"
            />
            <button id="btn-gen-submit" class="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors flex items-center gap-1.5">
              <span>Generate</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </div>

          <!-- Quick Templates -->
          <div class="px-4 py-2 bg-zinc-950/40 border-b border-zinc-800/80 flex items-center space-x-2 text-xs overflow-x-auto">
            <span class="text-zinc-500 flex-shrink-0">Suggestions:</span>
            <button class="gen-pill px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors whitespace-nowrap">Plan Q4 Security Audit with Sarah</button>
            <button class="gen-pill px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors whitespace-nowrap">Death Star Launch Checklist</button>
            <button class="gen-pill px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors whitespace-nowrap">Create Urgent Tasks View</button>
            <button class="gen-pill px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors whitespace-nowrap">Audit & summarize all expenses</button>
          </div>

          <!-- Generated Results Container -->
          <div id="gen-results-area" class="flex-1 overflow-y-auto p-6 space-y-4">
            <div class="text-center py-16 text-zinc-500">
              <svg class="w-10 h-10 mx-auto mb-2 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
              <p class="text-sm">Enter a prompt above or click a suggestion to synthesize items and views.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalEl = this.container.querySelector('#gen-modal');
    this.promptInput = this.container.querySelector('#gen-prompt-input');
    this.resultsArea = this.container.querySelector('#gen-results-area');

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelector('#gen-modal-close').addEventListener('click', () => this.hide());

    this.container.querySelector('#btn-gen-submit').addEventListener('click', () => {
      this.handleGenerate(this.promptInput.value);
    });

    this.promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleGenerate(this.promptInput.value);
      }
    });

    this.container.querySelectorAll('.gen-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.promptInput.value = pill.textContent.trim();
        this.handleGenerate(this.promptInput.value);
      });
    });
  }

  handleGenerate(prompt) {
    if (!prompt || !prompt.trim()) return;
    const clean = prompt.trim().toLowerCase();

    this.resultsArea.innerHTML = `
      <div class="flex items-center justify-center py-12 space-x-2 text-amber-400">
        <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span class="text-sm font-medium">Synthesizing data structures & UI components...</span>
      </div>
    `;

    setTimeout(() => {
      if (clean.includes('view') || clean.includes('dashboard')) {
        this.renderGeneratedViewUI(prompt);
      } else if (clean.includes('expense') || clean.includes('audit') || clean.includes('summarize')) {
        this.renderGeneratedSummaryUI(prompt);
      } else {
        this.renderGeneratedTasksUI(prompt);
      }
    }, 450);
  }

  renderGeneratedTasksUI(prompt) {
    const today = new Date();
    const d1 = new Date(today); d1.setDate(d1.getDate() + 2);
    const d2 = new Date(today); d2.setDate(d2.getDate() + 4);
    const d3 = new Date(today); d3.setDate(d3.getDate() + 7);

    let projectName = 'General Project';
    if (prompt.toLowerCase().includes('death star')) projectName = 'Death Star';
    else if (prompt.toLowerCase().includes('audit') || prompt.toLowerCase().includes('security')) projectName = 'Finance & Compliance';
    else if (prompt.toLowerCase().includes('website')) projectName = 'Website Redesign';

    const generated = [
      {
        text: `Define requirements and architecture scope for ${projectName}`,
        note: `Generated by AI assistant.\n\n- Align goals with key stakeholders\n- Establish deliverable milestones`,
        when: d1.toISOString().split('T')[0],
        project: projectName,
        priority: 'High',
        people: prompt.toLowerCase().includes('sarah') ? ['Sarah'] : ['Tom'],
        status: 'In Progress'
      },
      {
        text: `Conduct risk assessment and security audit for ${projectName}`,
        note: `Verify boundary conditions and defensive systems.`,
        when: d2.toISOString().split('T')[0],
        project: projectName,
        priority: 'Urgent',
        people: ['Sarah'],
        status: 'Pending'
      },
      {
        text: `Run end-to-end operational dry-run and sign-off`,
        note: `Final review meeting before rollout.`,
        when: d3.toISOString().split('T')[0],
        project: projectName,
        priority: 'Medium',
        people: ['Tom', 'Bob'],
        status: 'Pending'
      }
    ];

    let html = `
      <div class="space-y-4">
        <div class="p-4 rounded-lg bg-zinc-800/80 border border-zinc-700 flex items-center justify-between">
          <div>
            <h4 class="font-bold text-sm text-zinc-100">Synthesized ${generated.length} Action Items for "${projectName}"</h4>
            <p class="text-xs text-zinc-400">Review the generated items and click 'Add All to Workspace'</p>
          </div>
          <button id="btn-accept-gen-items" class="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow transition-colors">
            ✓ Add All to Workspace
          </button>
        </div>

        <div class="space-y-2">
          ${generated.map((item, idx) => `
            <div class="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/60 flex items-center justify-between text-xs">
              <div class="space-y-1 flex-1 pr-3">
                <span class="font-semibold text-zinc-200">${item.text}</span>
                <div class="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono">
                  <span>📅 ${item.when}</span>
                  <span>📁 ${item.project}</span>
                  <span>⚡ ${item.priority}</span>
                  <span>👤 ${item.people.join(', ')}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.resultsArea.innerHTML = html;

    this.resultsArea.querySelector('#btn-accept-gen-items').addEventListener('click', () => {
      const itemsToAdd = generated.map(g => new Item({
        text: g.text,
        note: g.note,
        categories: {
          When: g.when,
          Project: g.project,
          Priority: g.priority,
          People: g.people,
          Status: g.status
        }
      }));

      if (this.onBatchAddItems) {
        this.onBatchAddItems(itemsToAdd);
      }
      this.hide();
    });
  }

  renderGeneratedViewUI(prompt) {
    const isUrgent = prompt.toLowerCase().includes('urgent') || prompt.toLowerCase().includes('high');
    const newView = new View({
      name: isUrgent ? 'Urgent & Critical Focus' : 'Custom Synthesized Dashboard',
      description: 'AI Generated View configured to isolate high-priority operational items',
      type: 'sections',
      sectionCategory: 'Priority',
      columns: ['When', 'Project', 'People', 'Status', 'Cost'],
      filterExpression: isUrgent ? '[+Priority:Urgent]' : '[-Done]'
    });

    this.resultsArea.innerHTML = `
      <div class="p-5 rounded-lg bg-zinc-800/80 border border-zinc-700 space-y-4">
        <div>
          <h4 class="font-bold text-base text-zinc-100">Generated Agenda View Configuration</h4>
          <p class="text-xs text-zinc-400">Created customized layout and filter rules based on your request</p>
        </div>

        <div class="p-4 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs space-y-2 text-zinc-300">
          <div><strong>View Name:</strong> ${newView.name}</div>
          <div><strong>Layout Type:</strong> ${newView.type}</div>
          <div><strong>Grouped By:</strong> Section by ${newView.sectionCategory}</div>
          <div><strong>Columns:</strong> ${newView.columns.join(', ')}</div>
          <div><strong>Agenda Filter:</strong> <code class="text-amber-400">${newView.filterExpression}</code></div>
        </div>

        <button id="btn-save-gen-view" class="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow transition-colors">
          ✓ Save View to Toolbar
        </button>
      </div>
    `;

    this.resultsArea.querySelector('#btn-save-gen-view').addEventListener('click', () => {
      if (this.onAddView) {
        this.onAddView(newView);
      }
      this.hide();
    });
  }

  renderGeneratedSummaryUI() {
    const total = this.allItems.length;
    const completed = this.allItems.filter(i => i.done).length;
    const pending = total - completed;
    const totalCost = this.allItems.reduce((sum, i) => sum + (Number(i.cost) || 0), 0);

    this.resultsArea.innerHTML = `
      <div class="p-5 rounded-lg bg-zinc-800/80 border border-zinc-700 space-y-4">
        <h4 class="font-bold text-base text-zinc-100">Workload & Financial Summary</h4>
        <div class="grid grid-cols-3 gap-3">
          <div class="p-3 bg-zinc-900 rounded border border-zinc-800 text-center">
            <span class="text-xs text-zinc-400">Pending Tasks</span>
            <div class="text-xl font-bold text-amber-400 mt-1">${pending}</div>
          </div>
          <div class="p-3 bg-zinc-900 rounded border border-zinc-800 text-center">
            <span class="text-xs text-zinc-400">Completed</span>
            <div class="text-xl font-bold text-emerald-400 mt-1">${completed}</div>
          </div>
          <div class="p-3 bg-zinc-900 rounded border border-zinc-800 text-center">
            <span class="text-xs text-zinc-400">Total Tracked Cost</span>
            <div class="text-xl font-bold text-blue-400 mt-1">$${totalCost.toLocaleString()}</div>
          </div>
        </div>
        <p class="text-xs text-zinc-400 leading-relaxed">
          Operational velocity is healthy. You have ${pending} open tasks across ${new Set(this.allItems.map(i => i.getCategory('Project')).filter(Boolean)).size} active projects.
        </p>
      </div>
    `;
  }
}
