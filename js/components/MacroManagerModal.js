/**
 * MacroManagerModal.js - Lotus Agenda Macro Manager & Keyboard Shortcut Center.
 * Inspired by Agenda's Alt-F3 Macro system and command automation.
 */

export class MacroManagerModal {
  constructor({
    container,
    onRunMacro
  }) {
    this.container = container;
    this.onRunMacro = onRunMacro;
    this.render();
  }

  show() {
    this.modalEl.classList.remove('hidden');
  }

  hide() {
    this.modalEl.classList.add('hidden');
  }

  render() {
    this.container.innerHTML = `
      <div id="macro-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div class="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden text-zinc-100">
          <div class="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
            <div class="flex items-center space-x-3">
              <div class="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              </div>
              <div>
                <h3 class="font-bold text-base text-zinc-100">Lotus Agenda Macro Manager {Alt-F3}</h3>
                <p class="text-xs text-zinc-400">Execute automated workflows and view keyboard shortcuts</p>
              </div>
            </div>
            <button id="macro-modal-close" class="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 text-lg">✕</button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- Macro Actions List -->
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Built-in Agenda Automation Macros</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/80 hover:border-amber-500/60 transition-colors flex items-center justify-between">
                  <div>
                    <span class="font-bold text-sm text-zinc-200">Archive Completed</span>
                    <p class="text-[11px] text-zinc-400">Mark all done items as archived and hide from view</p>
                  </div>
                  <button class="btn-run-macro px-2.5 py-1 text-xs rounded bg-amber-500 text-black font-semibold hover:bg-amber-400" data-macro="archiveDone">Run</button>
                </div>

                <div class="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/80 hover:border-amber-500/60 transition-colors flex items-center justify-between">
                  <div>
                    <span class="font-bold text-sm text-zinc-200">Re-evaluate Rules</span>
                    <p class="text-[11px] text-zinc-400">Run all Agenda assignment rules on all items</p>
                  </div>
                  <button class="btn-run-macro px-2.5 py-1 text-xs rounded bg-amber-500 text-black font-semibold hover:bg-amber-400" data-macro="reapplyRules">Run</button>
                </div>

                <div class="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/80 hover:border-amber-500/60 transition-colors flex items-center justify-between">
                  <div>
                    <span class="font-bold text-sm text-zinc-200">Reschedule Overdue</span>
                    <p class="text-[11px] text-zinc-400">Bump all overdue tasks to Today</p>
                  </div>
                  <button class="btn-run-macro px-2.5 py-1 text-xs rounded bg-amber-500 text-black font-semibold hover:bg-amber-400" data-macro="bumpOverdue">Run</button>
                </div>

                <div class="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/80 hover:border-amber-500/60 transition-colors flex items-center justify-between">
                  <div>
                    <span class="font-bold text-sm text-zinc-200">Purge Completed</span>
                    <p class="text-[11px] text-zinc-400">Permanently delete all completed items</p>
                  </div>
                  <button class="btn-run-macro px-2.5 py-1 text-xs rounded bg-red-600 text-white font-semibold hover:bg-red-500" data-macro="purgeCompleted">Run</button>
                </div>
              </div>
            </div>

            <!-- Complete Keyboard Shortcuts Table -->
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Agenda & nvALT Keyboard Shortcuts</h4>
              <div class="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/40">
                <table class="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr class="bg-zinc-800 text-zinc-300 font-mono border-b border-zinc-700">
                      <th class="p-2.5 w-36">Key / Combo</th>
                      <th class="p-2.5">Action & Description</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-800 font-mono text-[11px]">
                    <tr><td class="p-2 text-amber-400 font-bold">Ctrl+L or /</td><td class="p-2 text-zinc-300 font-sans">Focus nvALT Omnibar (Search or Create)</td></tr>
                    <tr><td class="p-2 text-amber-400 font-bold">Enter</td><td class="p-2 text-zinc-300 font-sans">Open highlighted item or create new item if no match</td></tr>
                    <tr><td class="p-2 text-amber-400 font-bold">Shift+Enter</td><td class="p-2 text-zinc-300 font-sans">Force create new item from Omnibar query text</td></tr>
                    <tr><td class="p-2 text-amber-400 font-bold">Alt+N</td><td class="p-2 text-zinc-300 font-sans">Switch to Next View (Agenda View cycling)</td></tr>
                    <tr><td class="p-2 text-amber-400 font-bold">Alt+P</td><td class="p-2 text-zinc-300 font-sans">Switch to Previous View</td></tr>
                    <tr><td class="p-2 text-amber-400 font-bold">Alt+F3</td><td class="p-2 text-zinc-300 font-sans">Open Macro Manager</td></tr>
                    <tr><td class="p-2 text-amber-400 font-bold">F6</td><td class="p-2 text-zinc-300 font-sans">Open Category & Rules Manager</td></tr>
                    <tr><td class="p-2 text-amber-400 font-bold">F8</td><td class="p-2 text-zinc-300 font-sans">Open View Switcher</td></tr>
                    <tr><td class="p-2 text-amber-400 font-bold">Ctrl+S</td><td class="p-2 text-zinc-300 font-sans">Save note immediately</td></tr>
                    <tr><td class="p-2 text-amber-400 font-bold">[[WikiLink]]</td><td class="p-2 text-zinc-300 font-sans">Click to jump to linked note or create note</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalEl = this.container.querySelector('#macro-modal');
    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelector('#macro-modal-close').addEventListener('click', () => this.hide());

    this.container.querySelectorAll('.btn-run-macro').forEach(btn => {
      btn.addEventListener('click', () => {
        const macroName = btn.dataset.macro;
        if (this.onRunMacro) this.onRunMacro(macroName);
        this.hide();
      });
    });
  }
}
