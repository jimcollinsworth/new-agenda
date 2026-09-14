/**
 * Omnibar.js - nvALT Unified Search & Create Bar with Agenda NLP live preview.
 *
 * Typing performs incremental instant search.
 * Pressing Enter opens top item or creates new item if no match.
 * Pressing Shift+Enter immediately creates a new item with typed text.
 */

export class Omnibar {
  constructor({
    container,
    nlpEngine,
    onSearch,
    onCreateItem,
    onSelectItem,
    onNavigateList
  }) {
    this.container = container;
    this.nlpEngine = nlpEngine;
    this.onSearch = onSearch;
    this.onCreateItem = onCreateItem;
    this.onSelectItem = onSelectItem;
    this.onNavigateList = onNavigateList;

    this.query = '';
    this.parsedPreview = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="omnibar-wrapper w-full">
        <div class="relative flex items-center">
          <div class="absolute left-3 pointer-events-none text-zinc-400 flex items-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <input
            type="text"
            id="omnibar-input"
            class="w-full pl-9 pr-28 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors shadow-inner"
            placeholder="nvALT Search or type new item & press Enter... (e.g. Call Sarah this Friday @Tom #urgent)"
            autocomplete="off"
            spellcheck="false"
          />
          <div class="absolute right-2 flex items-center space-x-1">
            <button
              id="omnibar-clear-btn"
              class="hidden text-xs px-1.5 py-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
              title="Clear search (Esc)"
            >
              ✕
            </button>
            <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 hidden sm:inline-block">
              ↵ create
            </span>
          </div>
        </div>

        <!-- Real-time NLP Detection Preview Badge Bar -->
        <div id="omnibar-nlp-preview" class="hidden mt-1.5 px-3 py-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded-md text-xs flex flex-wrap items-center gap-2 text-zinc-300">
          <span class="font-semibold text-amber-400 flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Agenda NLP:
          </span>
          <div id="omnibar-nlp-chips" class="flex flex-wrap items-center gap-1.5"></div>
        </div>
      </div>
    `;

    this.input = this.container.querySelector('#omnibar-input');
    this.clearBtn = this.container.querySelector('#omnibar-clear-btn');
    this.previewContainer = this.container.querySelector('#omnibar-nlp-preview');
    this.chipsContainer = this.container.querySelector('#omnibar-nlp-chips');

    this.hasNavigatedList = false;
    this.bindEvents();
  }

  bindEvents() {
    this.input.addEventListener('input', (e) => {
      this.hasNavigatedList = false;
      this.query = e.target.value;
      if (this.query.trim()) {
        this.clearBtn.classList.remove('hidden');
        this.updateNLPPreview(this.query);
      } else {
        this.clearBtn.classList.add('hidden');
        this.previewContainer.classList.add('hidden');
      }
      if (this.onSearch) this.onSearch(this.query);
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const forceCreate = e.shiftKey;
        if (this.query.trim()) {
          if (forceCreate) {
            this.handleCreate();
          } else {
            // If onSelectItem returns false or no selection, create it
            const handled = this.onSelectItem ? this.onSelectItem(this.hasNavigatedList) : false;
            if (!handled) {
              this.handleCreate();
            }
          }
        }
      } else if (e.key === 'Escape') {
        if (this.query) {
          this.clear();
        } else {
          this.input.blur();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.hasNavigatedList = true;
        if (this.onNavigateList) this.onNavigateList('down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.hasNavigatedList = true;
        if (this.onNavigateList) this.onNavigateList('up');
      }
    });

    this.clearBtn.addEventListener('click', () => {
      this.clear();
    });

    // Global shortcut Ctrl+L or / to focus omnibar
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        this.focus();
      } else if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.focus();
      }
    });
  }

  updateNLPPreview(text) {
    if (!this.nlpEngine) return;
    const parsed = this.nlpEngine.parse(text);
    this.parsedPreview = parsed;

    const chips = [];

    if (parsed.whenDisplay || parsed.when) {
      chips.push(`<span class="inline-flex items-center px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50 font-mono text-[11px]">📅 ${parsed.whenDisplay || parsed.when}</span>`);
    }

    if (parsed.recurrence) {
      chips.push(`<span class="inline-flex items-center px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 font-mono text-[11px]">🔄 ${parsed.recurrence}</span>`);
    }

    if (parsed.priority) {
      const color = parsed.priority === 'Urgent' ? 'bg-red-900/60 text-red-300 border-red-700/50' : 'bg-orange-900/60 text-orange-300 border-orange-700/50';
      chips.push(`<span class="inline-flex items-center px-2 py-0.5 rounded ${color} border font-mono text-[11px]">⚡ ${parsed.priority}</span>`);
    }

    if (parsed.project) {
      chips.push(`<span class="inline-flex items-center px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50 font-mono text-[11px]">📁 ${parsed.project}</span>`);
    }

    if (parsed.people && parsed.people.length > 0) {
      chips.push(`<span class="inline-flex items-center px-2 py-0.5 rounded bg-pink-900/60 text-pink-300 border border-pink-700/50 font-mono text-[11px]">👤 ${parsed.people.join(', ')}</span>`);
    }

    if (parsed.cost !== null) {
      chips.push(`<span class="inline-flex items-center px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 font-mono text-[11px]">💰 $${parsed.cost}</span>`);
    }

    if (parsed.tags && parsed.tags.length > 0) {
      chips.push(`<span class="inline-flex items-center px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/50 font-mono text-[11px]">🏷️ #${parsed.tags.join(', #')}</span>`);
    }

    if (chips.length > 0) {
      this.chipsContainer.innerHTML = chips.join(' ');
      this.previewContainer.classList.remove('hidden');
    } else {
      this.previewContainer.classList.add('hidden');
    }
  }

  handleCreate() {
    if (!this.query.trim()) return;
    const textToCreate = this.query.trim();
    if (this.onCreateItem) {
      this.onCreateItem(textToCreate, this.parsedPreview);
    }
    this.clear();
  }

  clear() {
    this.query = '';
    this.input.value = '';
    this.clearBtn.classList.add('hidden');
    this.previewContainer.classList.add('hidden');
    if (this.onSearch) this.onSearch('');
  }

  focus() {
    this.input.focus();
    this.input.select();
  }

  getValue() {
    return this.query;
  }
}
