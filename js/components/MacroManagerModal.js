/**
 * MacroManagerModal.js - Lotus Agenda Macro Command Center & Prompt Automation.
 * Inspired by Agenda's Alt-F3 Macro language and President's Planner automation.
 *
 * Features:
 * 1. Macro Registry with one-click execution and hotkeys (Alt+1..Alt+5)
 * 2. Script Runner for raw Agenda Macro language: {VIEW ...}, {FILTER ...}, {ASSIGN ...}
 * 3. Prompt-Based AI Assistant: converts natural language instructions to executable Agenda macros
 * 4. Interactive Command Execution Console with step-by-step logs
 */

export class MacroManagerModal {
  constructor({
    container,
    macroEngine,
    onRunMacro
  }) {
    this.container = container;
    this.macroEngine = macroEngine;
    this.onRunMacro = onRunMacro;

    this.activeTab = 'registry'; // 'registry', 'cli', 'prompt'
    this.render();
  }

  show(tab = 'registry') {
    this.activeTab = tab;
    this.updateTabUI();
    this.modalEl.classList.remove('hidden');
    this.renderActiveTabContent();
  }

  hide() {
    this.modalEl.classList.add('hidden');
  }

  render() {
    this.container.innerHTML = `
      <div id="macro-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
        <div class="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden text-zinc-100">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
            <div class="flex items-center space-x-3">
              <div class="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              </div>
              <div>
                <h3 class="font-bold text-base text-zinc-100 flex items-center gap-2">
                  Lotus Agenda Macro & Prompt Center
                  <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Alt-F3</span>
                </h3>
                <p class="text-xs text-zinc-400">Execute automated workflows, run Agenda macro syntax, or prompt with natural language</p>
              </div>
            </div>
            <button id="macro-modal-close" class="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 text-lg">✕</button>
          </div>

          <!-- Navigation Tabs -->
          <div class="px-6 pt-3 border-b border-zinc-800 bg-zinc-900 flex space-x-6 text-xs font-semibold">
            <button id="tab-macro-registry" class="tab-btn pb-2.5 border-b-2 border-amber-500 text-amber-400 flex items-center gap-1.5">
              <span>⚡ Saved Macros & Hotkeys</span>
            </button>
            <button id="tab-macro-cli" class="tab-btn pb-2.5 border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5">
              <span>⌨️ Script Runner {CLI}</span>
            </button>
            <button id="tab-macro-prompt" class="tab-btn pb-2.5 border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5">
              <span>🤖 Prompt-Based Automation</span>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
            <!-- Active Tab Mount Point -->
            <div id="macro-tab-mount" class="flex-1 overflow-y-auto p-6"></div>

            <!-- Execution Console Log Output Area -->
            <div class="h-36 border-t border-zinc-800 bg-zinc-950 p-3 flex flex-col font-mono text-xs flex-shrink-0">
              <div class="flex items-center justify-between text-zinc-500 text-[10px] uppercase tracking-wider mb-1.5">
                <span>Execution Console Log</span>
                <button id="btn-clear-console" class="text-zinc-400 hover:text-zinc-200">Clear</button>
              </div>
              <div id="macro-console-output" class="flex-1 overflow-y-auto text-[11px] text-zinc-300 space-y-1 select-text">
                <div class="text-zinc-600">// Ready to execute macros...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalEl = this.container.querySelector('#macro-modal');
    this.tabMount = this.container.querySelector('#macro-tab-mount');
    this.consoleOutput = this.container.querySelector('#macro-console-output');

    this.tabRegistryBtn = this.container.querySelector('#tab-macro-registry');
    this.tabCliBtn = this.container.querySelector('#tab-macro-cli');
    this.tabPromptBtn = this.container.querySelector('#tab-macro-prompt');

    this.bindEvents();
    this.renderActiveTabContent();
  }

  bindEvents() {
    this.container.querySelector('#macro-modal-close').addEventListener('click', () => this.hide());
    this.container.querySelector('#btn-clear-console').addEventListener('click', () => {
      this.consoleOutput.innerHTML = '<div class="text-zinc-600">// Ready to execute macros...</div>';
    });

    this.tabRegistryBtn.addEventListener('click', () => {
      this.activeTab = 'registry';
      this.updateTabUI();
      this.renderActiveTabContent();
    });

    this.tabCliBtn.addEventListener('click', () => {
      this.activeTab = 'cli';
      this.updateTabUI();
      this.renderActiveTabContent();
    });

    this.tabPromptBtn.addEventListener('click', () => {
      this.activeTab = 'prompt';
      this.updateTabUI();
      this.renderActiveTabContent();
    });
  }

  updateTabUI() {
    const tabs = [
      { id: 'registry', btn: this.tabRegistryBtn },
      { id: 'cli', btn: this.tabCliBtn },
      { id: 'prompt', btn: this.tabPromptBtn }
    ];

    tabs.forEach(t => {
      if (t.id === this.activeTab) {
        t.btn.className = 'tab-btn pb-2.5 border-b-2 border-amber-500 text-amber-400 flex items-center gap-1.5';
      } else {
        t.btn.className = 'tab-btn pb-2.5 border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5';
      }
    });
  }

  renderActiveTabContent() {
    if (this.activeTab === 'registry') {
      this.renderRegistryTab();
    } else if (this.activeTab === 'cli') {
      this.renderCliTab();
    } else {
      this.renderPromptTab();
    }
  }

  // --- Tab 1: Saved Macros & Hotkeys ---
  renderRegistryTab() {
    const macros = this.macroEngine ? this.macroEngine.customMacros : [];

    this.tabMount.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-bold text-sm text-zinc-100">President's Planner & Custom Automations</h4>
            <p class="text-xs text-zinc-400">Trigger standard workflows with 1-click or quick key combos</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${macros.map(m => `
            <div class="p-4 rounded-xl bg-zinc-800/80 border border-zinc-700/80 hover:border-amber-500/50 transition-colors flex flex-col justify-between space-y-3">
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-sm text-zinc-100">${m.name}</span>
                  ${m.shortcut ? `<span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 font-mono text-[10px] text-amber-400 font-bold">${m.shortcut}</span>` : ''}
                </div>
                <p class="text-xs text-zinc-400 leading-relaxed">${m.description}</p>
                <div class="pt-2">
                  <code class="text-[11px] font-mono text-amber-300 bg-zinc-950 px-2 py-1 rounded block border border-zinc-800">${m.script}</code>
                </div>
              </div>

              <div class="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-700/60">
                ${!m.isBuiltin ? `
                  <button class="btn-delete-macro px-2.5 py-1 text-xs text-red-400 hover:text-red-300 rounded hover:bg-zinc-700" data-id="${m.id}">Delete</button>
                ` : ''}
                <button class="btn-run-script px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow transition-colors" data-script="${m.script.replace(/"/g, '&quot;')}">
                  ▶ Run Macro
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Create Custom Macro Form -->
        <div class="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
          <h5 class="font-bold text-xs uppercase tracking-wider text-zinc-400">+ Add Custom Agenda Macro</h5>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <input type="text" id="new-macro-name" placeholder="Macro Name (e.g. My Sprint View)" class="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-zinc-100" />
            <input type="text" id="new-macro-shortcut" placeholder="Hotkey (e.g. Alt+6, F10)" class="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-zinc-100" />
            <button id="btn-save-new-macro" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded transition-colors">
              Save Custom Macro
            </button>
          </div>
          <input type="text" id="new-macro-script" placeholder="Agenda Script: e.g. {VIEW Datebook}; {FILTER [+Priority:Urgent]}" class="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono text-zinc-100" />
        </div>
      </div>
    `;

    // Bind Run
    this.tabMount.querySelectorAll('.btn-run-script').forEach(btn => {
      btn.addEventListener('click', () => {
        this.runScript(btn.dataset.script);
      });
    });

    // Bind Delete
    this.tabMount.querySelectorAll('.btn-delete-macro').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.macroEngine) {
          this.macroEngine.deleteCustomMacro(btn.dataset.id);
          this.renderRegistryTab();
        }
      });
    });

    // Bind Save New
    const saveBtn = this.tabMount.querySelector('#btn-save-new-macro');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const name = this.tabMount.querySelector('#new-macro-name').value;
        const shortcut = this.tabMount.querySelector('#new-macro-shortcut').value;
        const script = this.tabMount.querySelector('#new-macro-script').value;
        if (!name || !script) {
          alert('Please provide a name and script.');
          return;
        }
        if (this.macroEngine) {
          this.macroEngine.addCustomMacro({ name, shortcut, script });
          this.renderRegistryTab();
        }
      });
    }
  }

  // --- Tab 2: Script Runner CLI ---
  renderCliTab() {
    this.tabMount.innerHTML = `
      <div class="space-y-4">
        <div>
          <h4 class="font-bold text-sm text-zinc-100">Agenda Macro Script Interpreter</h4>
          <p class="text-xs text-zinc-400">Execute command chains using Lotus Agenda curly-brace syntax <code class="text-amber-400 font-mono">{COMMAND args}</code></p>
        </div>

        <!-- Quick Syntax Examples -->
        <div class="flex flex-wrap gap-2 text-xs font-mono">
          <button class="cli-snippet px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700">{ROLLOVER}; {RULES}</button>
          <button class="cli-snippet px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700">{VIEW Project Planner}; {FILTER [-Done]}</button>
          <button class="cli-snippet px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700">{ASSIGN Priority Urgent}</button>
          <button class="cli-snippet px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700">{ADD Sync with Tom Friday priority:High}</button>
          <button class="cli-snippet px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700">{TRIAGE}</button>
        </div>

        <div class="space-y-2">
          <textarea
            id="macro-cli-input"
            rows="6"
            class="w-full p-4 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            placeholder="Type macro commands here, separated by semicolons:&#10;{VIEW Datebook Schedule}&#10;{FILTER [+Priority:High]}&#10;{ROLLOVER}"
          ></textarea>

          <div class="flex items-center justify-between">
            <span class="text-[11px] font-mono text-zinc-500">Supports: VIEW, FILTER, SEARCH, ADD, ASSIGN, ROLLOVER, ARCHIVE, PURGE, RULES, DELEGATE, TRIAGE, TEMPLATE, THEME</span>
            <button id="btn-run-cli" class="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow transition-colors flex items-center gap-1.5">
              <span>▶ Execute Script</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const cliInput = this.tabMount.querySelector('#macro-cli-input');
    this.tabMount.querySelectorAll('.cli-snippet').forEach(snip => {
      snip.addEventListener('click', () => {
        cliInput.value = snip.textContent.trim();
      });
    });

    this.tabMount.querySelector('#btn-run-cli').addEventListener('click', () => {
      this.runScript(cliInput.value);
    });
  }

  // --- Tab 3: Prompt-Based AI Assistant ---
  renderPromptTab() {
    this.tabMount.innerHTML = `
      <div class="space-y-5">
        <div>
          <h4 class="font-bold text-sm text-zinc-100">Prompt-Based Macro Assistant</h4>
          <p class="text-xs text-zinc-400">State your objective in natural language; the engine interprets and translates it to native Agenda macro commands</p>
        </div>

        <!-- Sample Prompts -->
        <div class="flex flex-wrap gap-2 text-xs">
          <button class="prompt-chip px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300">Roll all overdue tasks to today and reapply rules</button>
          <button class="prompt-chip px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300">Switch to Project Planner and filter High priority</button>
          <button class="prompt-chip px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300">Delegate Death Star review to Sarah by Friday</button>
          <button class="prompt-chip px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300">Triage ambiguous statements</button>
          <button class="prompt-chip px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300">Archive completed items</button>
        </div>

        <div class="flex space-x-2">
          <input
            type="text"
            id="prompt-input"
            class="flex-1 px-4 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            placeholder="e.g. 'Reschedule overdue tasks to today and show open items', 'Delegate review to Tom'"
          />
          <button id="btn-translate-prompt" class="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors flex items-center gap-1.5">
            <span>Synthesize Macro</span>
          </button>
        </div>

        <!-- Translation Preview Box -->
        <div id="prompt-translation-box" class="hidden p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3 font-mono text-xs">
          <div class="text-zinc-400">Synthesized Macro Script:</div>
          <pre id="prompt-macro-code" class="p-3 bg-zinc-900 rounded border border-zinc-700 text-amber-300 font-bold select-text"></pre>
          <div id="prompt-explanation" class="text-zinc-400 text-[11px] font-sans"></div>
          <div class="flex justify-end pt-2">
            <button id="btn-run-translated" class="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow transition-colors">
              ✓ Execute Generated Macro
            </button>
          </div>
        </div>
      </div>
    `;

    const promptInp = this.tabMount.querySelector('#prompt-input');
    const transBox = this.tabMount.querySelector('#prompt-translation-box');
    const macroCode = this.tabMount.querySelector('#prompt-macro-code');
    const explanationEl = this.tabMount.querySelector('#prompt-explanation');
    const runTransBtn = this.tabMount.querySelector('#btn-run-translated');

    this.tabMount.querySelectorAll('.prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        promptInp.value = chip.textContent.trim();
        this.synthesizePrompt(promptInp.value, transBox, macroCode, explanationEl);
      });
    });

    this.tabMount.querySelector('#btn-translate-prompt').addEventListener('click', () => {
      this.synthesizePrompt(promptInp.value, transBox, macroCode, explanationEl);
    });

    promptInp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.synthesizePrompt(promptInp.value, transBox, macroCode, explanationEl);
      }
    });

    runTransBtn.addEventListener('click', () => {
      this.runScript(macroCode.textContent.trim());
    });
  }

  synthesizePrompt(promptText, transBox, macroCode, explanationEl) {
    if (!promptText || !promptText.trim()) return;
    if (!this.macroEngine) return;

    const result = this.macroEngine.translatePromptToMacro(promptText);
    macroCode.textContent = result.macroScript;
    explanationEl.textContent = `Action Intent: ${result.explanation}`;
    transBox.classList.remove('hidden');
  }

  // --- Runner & Logging ---
  runScript(script) {
    if (!script || !script.trim()) return;
    if (!this.macroEngine) {
      alert('MacroEngine not initialized.');
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const result = this.macroEngine.execute(script);

    let logHtml = `<div class="font-bold text-amber-400">[${timestamp}] Executing: ${script}</div>`;
    result.log.forEach(line => {
      const color = line.startsWith('✓') ? 'text-emerald-400' : 'text-red-400';
      logHtml += `<div class="${color}">${line}</div>`;
    });

    this.consoleOutput.innerHTML = logHtml + this.consoleOutput.innerHTML;
  }
}
