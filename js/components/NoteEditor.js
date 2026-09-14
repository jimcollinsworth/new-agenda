/**
 * NoteEditor.js - nvALT Markdown Note Editor with Live Preview & [[WikiLinks]]
 *
 * Supports MultiMarkdown rendering, live word/character counts,
 * WikiLink auto-resolution and navigation, and inline category editing.
 */

export class NoteEditor {
  constructor({
    container,
    onUpdateItem,
    onNavigateWikiLink,
    categories = [],
    allItems = []
  }) {
    this.container = container;
    this.onUpdateItem = onUpdateItem;
    this.onNavigateWikiLink = onNavigateWikiLink;
    this.categories = categories;
    this.allItems = allItems;

    this.currentItem = null;
    this.viewMode = 'split'; // 'split', 'editor', 'preview'
    this.saveTimeout = null;

    this.render();
  }

  setCategories(categories) {
    this.categories = categories;
  }

  setAllItems(items) {
    this.allItems = items;
  }

  render() {
    this.container.innerHTML = `
      <div class="note-editor-wrapper h-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-sm">
        <!-- Empty State if no item selected -->
        <div id="editor-empty" class="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
          <svg class="w-12 h-12 mb-3 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          <p class="text-sm font-medium text-zinc-400">No Item Selected</p>
          <p class="text-xs mt-1 text-zinc-600">Select an item from the list or create one via the Omnibar</p>
        </div>

        <!-- Active Item Content -->
        <div id="editor-content" class="hidden flex-1 flex flex-col min-h-0">
          <!-- Item Header & Categories Pill Bar -->
          <div class="p-3.5 border-b border-zinc-800 bg-zinc-900/90 space-y-2">
            <!-- Headline Input -->
            <div class="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editor-done-checkbox"
                class="w-4 h-4 rounded border-zinc-700 text-amber-500 focus:ring-amber-500 bg-zinc-800 cursor-pointer"
              />
              <input
                type="text"
                id="editor-item-title"
                class="flex-1 text-base font-bold bg-transparent text-zinc-100 border-b border-transparent hover:border-zinc-700 focus:border-amber-500 focus:outline-none transition-colors px-1"
                placeholder="Item Headline..."
              />
              <div class="flex items-center space-x-1.5 text-xs text-zinc-400">
                <span id="editor-save-indicator" class="text-[11px] font-mono text-emerald-400 opacity-0 transition-opacity">Saved</span>
              </div>
            </div>

            <!-- Categories Chips Row -->
            <div id="editor-categories-bar" class="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <!-- Dynamically populated -->
            </div>
          </div>

          <!-- Markdown Toolbar & View Switcher -->
          <div class="px-3 py-1.5 bg-zinc-800/60 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <div class="flex items-center space-x-1">
              <button class="md-btn px-2 py-1 rounded hover:bg-zinc-700 hover:text-zinc-200 transition-colors font-bold" data-action="bold" title="Bold (**)">B</button>
              <button class="md-btn px-2 py-1 rounded hover:bg-zinc-700 hover:text-zinc-200 transition-colors italic" data-action="italic" title="Italic (*)">I</button>
              <button class="md-btn px-2 py-1 rounded hover:bg-zinc-700 hover:text-zinc-200 transition-colors" data-action="h2" title="Heading (##)">H2</button>
              <button class="md-btn px-2 py-1 rounded hover:bg-zinc-700 hover:text-zinc-200 transition-colors" data-action="ul" title="Bullet List">• List</button>
              <button class="md-btn px-2 py-1 rounded hover:bg-zinc-700 hover:text-zinc-200 transition-colors" data-action="task" title="Task list (- [ ])">☑ Task</button>
              <button class="md-btn px-2 py-1 rounded hover:bg-zinc-700 hover:text-zinc-200 transition-colors font-mono" data-action="code" title="Code block (\`\`\`)">&lt;/&gt;</button>
              <button class="md-btn px-2 py-1 rounded hover:bg-zinc-700 hover:text-zinc-200 transition-colors text-amber-400" data-action="wikilink" title="Insert [[WikiLink]]">[[ Wiki ]]</button>
            </div>

            <!-- Split / Preview / Edit toggle -->
            <div class="flex items-center space-x-1 bg-zinc-800 rounded p-0.5 border border-zinc-700/60">
              <button class="mode-btn px-2 py-0.5 rounded text-[11px] hover:text-zinc-200 transition-colors bg-zinc-700 text-amber-400 font-semibold" data-mode="split">Split</button>
              <button class="mode-btn px-2 py-0.5 rounded text-[11px] hover:text-zinc-200 transition-colors" data-mode="editor">Edit</button>
              <button class="mode-btn px-2 py-0.5 rounded text-[11px] hover:text-zinc-200 transition-colors" data-mode="preview">Preview</button>
            </div>
          </div>

          <!-- Note Body Area (Split / Full) -->
          <div class="flex-1 flex min-h-0 relative">
            <!-- Textarea Editor -->
            <div id="editor-pane" class="w-1/2 h-full flex flex-col border-r border-zinc-800">
              <textarea
                id="note-textarea"
                class="flex-1 w-full h-full p-4 bg-zinc-950 text-zinc-200 text-sm font-mono focus:outline-none resize-none leading-relaxed"
                placeholder="Write extended note in MultiMarkdown... Use [[WikiLinks]] to connect items."
                spellcheck="true"
              ></textarea>
            </div>

            <!-- Rendered Preview -->
            <div id="preview-pane" class="w-1/2 h-full p-4 overflow-y-auto bg-zinc-900/50 prose prose-invert max-w-none text-sm leading-relaxed">
              <div id="markdown-output"></div>
            </div>
          </div>

          <!-- Footer Status Bar (Word count, Read time, nvALT stats) -->
          <div class="px-3 py-1 bg-zinc-800/80 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <div class="flex items-center space-x-3">
              <span id="stat-words">0 words</span>
              <span>•</span>
              <span id="stat-chars">0 characters</span>
              <span>•</span>
              <span id="stat-reading">0 min read</span>
            </div>
            <div>
              <span id="stat-updated">Updated just now</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.emptyState = this.container.querySelector('#editor-empty');
    this.contentState = this.container.querySelector('#editor-content');
    this.titleInput = this.container.querySelector('#editor-item-title');
    this.doneCheckbox = this.container.querySelector('#editor-done-checkbox');
    this.categoriesBar = this.container.querySelector('#editor-categories-bar');
    this.textarea = this.container.querySelector('#note-textarea');
    this.previewPane = this.container.querySelector('#preview-pane');
    this.editorPane = this.container.querySelector('#editor-pane');
    this.markdownOutput = this.container.querySelector('#markdown-output');
    this.saveIndicator = this.container.querySelector('#editor-save-indicator');

    this.statWords = this.container.querySelector('#stat-words');
    this.statChars = this.container.querySelector('#stat-chars');
    this.statReading = this.container.querySelector('#stat-reading');
    this.statUpdated = this.container.querySelector('#stat-updated');

    this.bindEvents();
  }

  loadItem(item) {
    this.currentItem = item;
    if (!item) {
      this.emptyState.classList.remove('hidden');
      this.contentState.classList.add('hidden');
      return;
    }

    this.emptyState.classList.add('hidden');
    this.contentState.classList.remove('hidden');

    this.titleInput.value = item.text || '';
    this.doneCheckbox.checked = item.done;
    this.textarea.value = item.note || '';

    this.renderCategoriesBar();
    this.updatePreview();
    this.updateStats();
  }

  renderCategoriesBar() {
    if (!this.currentItem) return;

    let html = '';

    // Render When Pill
    const when = this.currentItem.getCategory('When');
    html += `
      <div class="inline-flex items-center px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300 gap-1">
        <span>📅</span>
        <input
          type="date"
          class="cat-edit-when bg-transparent border-none text-blue-300 focus:outline-none text-[11px] font-mono cursor-pointer"
          value="${when ? String(when).split('T')[0] : ''}"
          title="Due Date (When)"
        />
      </div>
    `;

    // Render Priority Pill
    const rawPriority = this.currentItem.getCategory('Priority');
    const priority = Array.isArray(rawPriority) ? rawPriority[0] : (rawPriority || 'None');
    html += `
      <div class="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 gap-1">
        <span>⚡ Priority:</span>
        <select class="cat-edit-priority bg-transparent border-none text-zinc-200 focus:outline-none text-[11px] font-mono cursor-pointer">
          <option value="" ${priority === 'None' ? 'selected' : ''}>None</option>
          <option value="Urgent" ${priority === 'Urgent' ? 'selected' : ''}>Urgent</option>
          <option value="High" ${priority === 'High' ? 'selected' : ''}>High</option>
          <option value="Medium" ${priority === 'Medium' ? 'selected' : ''}>Medium</option>
          <option value="Low" ${priority === 'Low' ? 'selected' : ''}>Low</option>
        </select>
      </div>
    `;

    // Render Project Pill
    const rawProject = this.currentItem.getCategory('Project');
    const project = Array.isArray(rawProject) ? rawProject[0] : (rawProject || '');
    const projCat = this.categories.find(c => c.name === 'Project');
    const projOptions = projCat ? projCat.values.map(v => v.name) : ['Death Star', 'Website Redesign', 'Finance & Compliance', 'Personal'];
    html += `
      <div class="inline-flex items-center px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300 gap-1">
        <span>📁 Project:</span>
        <select class="cat-edit-project bg-transparent border-none text-purple-200 focus:outline-none text-[11px] font-mono cursor-pointer">
          <option value="">None</option>
          ${projOptions.map(p => `<option value="${p}" ${project === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
    `;

    // Render Status Pill
    const rawStatus = this.currentItem.getCategory('Status');
    const status = Array.isArray(rawStatus) ? rawStatus[0] : (rawStatus || 'Pending');
    html += `
      <div class="inline-flex items-center px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 gap-1">
        <span>Status:</span>
        <select class="cat-edit-status bg-transparent border-none text-emerald-200 focus:outline-none text-[11px] font-mono cursor-pointer">
          <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="In Progress" ${status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Blocked" ${status === 'Blocked' ? 'selected' : ''}>Blocked</option>
          <option value="Done" ${status === 'Done' ? 'selected' : ''}>Done</option>
        </select>
      </div>
    `;

    // Render Cost Pill
    const cost = this.currentItem.cost;
    html += `
      <div class="inline-flex items-center px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 gap-1">
        <span>💰 $</span>
        <input
          type="number"
          step="0.01"
          class="cat-edit-cost w-20 bg-transparent border-none text-emerald-300 focus:outline-none text-[11px] font-mono"
          placeholder="0.00"
          value="${cost !== null && cost !== undefined ? cost : ''}"
        />
      </div>
    `;

    this.categoriesBar.innerHTML = html;

    // Category change events
    const whenInput = this.categoriesBar.querySelector('.cat-edit-when');
    whenInput.addEventListener('change', (e) => {
      this.currentItem.setCategory('When', e.target.value || null);
      this.triggerSave();
    });

    const prioritySelect = this.categoriesBar.querySelector('.cat-edit-priority');
    prioritySelect.addEventListener('change', (e) => {
      this.currentItem.setCategory('Priority', e.target.value || null);
      this.triggerSave();
    });

    const projectSelect = this.categoriesBar.querySelector('.cat-edit-project');
    projectSelect.addEventListener('change', (e) => {
      this.currentItem.setCategory('Project', e.target.value || null);
      this.triggerSave();
    });

    const statusSelect = this.categoriesBar.querySelector('.cat-edit-status');
    statusSelect.addEventListener('change', (e) => {
      this.currentItem.setCategory('Status', e.target.value || 'Pending');
      if (e.target.value === 'Done' && !this.currentItem.done) {
        this.currentItem.done = true;
        this.doneCheckbox.checked = true;
      }
      this.triggerSave();
    });

    const costInput = this.categoriesBar.querySelector('.cat-edit-cost');
    costInput.addEventListener('change', (e) => {
      const val = e.target.value ? parseFloat(e.target.value) : null;
      this.currentItem.cost = val;
      this.currentItem.setCategory('Cost', val);
      this.triggerSave();
    });
  }

  bindEvents() {
    // Title change
    this.titleInput.addEventListener('input', (e) => {
      if (!this.currentItem) return;
      this.currentItem.text = e.target.value;
      this.triggerSave();
    });

    // Checkbox toggle
    this.doneCheckbox.addEventListener('change', (e) => {
      if (!this.currentItem) return;
      this.currentItem.done = e.target.checked;
      if (e.target.checked) {
        this.currentItem.setCategory('Status', 'Done');
      }
      this.renderCategoriesBar();
      this.triggerSave();
    });

    // Textarea input
    this.textarea.addEventListener('input', () => {
      if (!this.currentItem) return;
      this.currentItem.note = this.textarea.value;
      this.updatePreview();
      this.updateStats();
      this.triggerSave();
    });

    // Markdown toolbar buttons
    this.container.querySelectorAll('.md-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.insertMarkdown(action);
      });
    });

    // Layout mode buttons (Split, Edit, Preview)
    this.container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('bg-zinc-700', 'text-amber-400', 'font-semibold'));
        btn.classList.add('bg-zinc-700', 'text-amber-400', 'font-semibold');
        this.setMode(btn.dataset.mode);
      });
    });

    // Handle clicks inside markdown preview for [[WikiLinks]]
    this.markdownOutput.addEventListener('click', (e) => {
      const link = e.target.closest('.wikilink');
      if (link) {
        e.preventDefault();
        const targetTitle = link.dataset.target;
        if (this.onNavigateWikiLink) {
          this.onNavigateWikiLink(targetTitle);
        }
      }
    });
  }

  setMode(mode) {
    this.viewMode = mode;
    if (mode === 'split') {
      this.editorPane.classList.remove('hidden', 'w-full');
      this.editorPane.classList.add('w-1/2');
      this.previewPane.classList.remove('hidden', 'w-full');
      this.previewPane.classList.add('w-1/2');
    } else if (mode === 'editor') {
      this.editorPane.classList.remove('hidden', 'w-1/2');
      this.editorPane.classList.add('w-full');
      this.previewPane.classList.add('hidden');
    } else if (mode === 'preview') {
      this.editorPane.classList.add('hidden');
      this.previewPane.classList.remove('hidden', 'w-1/2');
      this.previewPane.classList.add('w-full');
    }
  }

  insertMarkdown(action) {
    const el = this.textarea;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const sel = el.value.substring(start, end);
    let before = el.value.substring(0, start);
    let after = el.value.substring(end);
    let replacement = '';
    let cursorOffset = 0;

    switch (action) {
      case 'bold':
        replacement = `**${sel || 'bold text'}**`;
        cursorOffset = sel ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${sel || 'italic text'}*`;
        cursorOffset = sel ? replacement.length : 1;
        break;
      case 'h2':
        replacement = `\n## ${sel || 'Heading'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'ul':
        replacement = `\n- ${sel || 'List item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'task':
        replacement = `\n- [ ] ${sel || 'Checklist item'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'code':
        replacement = `\n\`\`\`\n${sel || 'code here'}\n\`\`\`\n`;
        cursorOffset = replacement.length;
        break;
      case 'wikilink':
        replacement = `[[${sel || 'Note Title'}]]`;
        cursorOffset = sel ? replacement.length : 2;
        break;
      default:
        return;
    }

    el.value = before + replacement + after;
    el.selectionStart = start + cursorOffset;
    el.selectionEnd = start + cursorOffset;
    el.focus();

    if (this.currentItem) {
      this.currentItem.note = el.value;
      this.updatePreview();
      this.updateStats();
      this.triggerSave();
    }
  }

  updatePreview() {
    const rawNote = (this.currentItem ? this.currentItem.note : '') || '';

    // Render Markdown using window.marked if available, or fallback
    let rendered = '';
    if (window.marked && typeof window.marked.parse === 'function') {
      rendered = window.marked.parse(rawNote);
    } else {
      rendered = this.simpleMarkdownParser(rawNote);
    }

    // Transform [[WikiLinks]] into clickable badges
    rendered = rendered.replace(/\[\[(.*?)\]\]/g, (match, target) => {
      const cleanTarget = target.trim();
      const lower = cleanTarget.toLowerCase();
      const exists = this.allItems.some(i => i.text.toLowerCase() === lower) ||
                     this.allItems.some(i => {
                       const p = i.getCategory('Project');
                       const ppl = i.getCategory('People');
                       return (typeof p === 'string' && p.toLowerCase() === lower) ||
                              (Array.isArray(ppl) && ppl.some(person => person.toLowerCase() === lower));
                     }) ||
                     this.categories.some(c => c.name.toLowerCase() === lower || (c.findValueByName && c.findValueByName(cleanTarget)));
      const statusClass = exists ? 'text-amber-400 border-amber-500/50 bg-amber-950/30' : 'text-zinc-400 border-zinc-700 bg-zinc-800/40';
      return `<a href="#" class="wikilink inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-mono no-underline hover:underline ${statusClass}" data-target="${cleanTarget}">🔗 ${cleanTarget}</a>`;
    });

    this.markdownOutput.innerHTML = rendered || '<p class="text-zinc-600 italic">Empty note. Type in markdown above.</p>';
  }

  simpleMarkdownParser(text) {
    if (!text) return '';
    let html = this.escapeHtml(text);
    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-zinc-200 mt-3 mb-1">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-zinc-100 mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold text-zinc-100 mt-4 mb-2">$1</h1>');
    // Checkboxes
    html = html.replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled class="rounded bg-zinc-800 border-zinc-700 text-amber-500"> <span>$1</span></div>');
    html = html.replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2 my-1 text-zinc-500 line-through"><input type="checkbox" checked disabled class="rounded bg-zinc-800 border-zinc-700 text-amber-500"> <span>$1</span></div>');
    // Bullet lists
    html = html.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-zinc-300">$1</li>');
    // Bold / Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-zinc-950 p-2 rounded text-xs font-mono text-zinc-300 border border-zinc-800 my-2 overflow-x-auto">$1</pre>');
    // Paragraphs / Newlines
    html = html.replace(/\n\n/g, '<br/><br/>');
    return html;
  }

  updateStats() {
    const text = (this.currentItem ? this.currentItem.note : '') || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const readTime = Math.ceil(words / 200);

    this.statWords.textContent = `${words} word${words === 1 ? '' : 's'}`;
    this.statChars.textContent = `${chars} character${chars === 1 ? '' : 's'}`;
    this.statReading.textContent = `${readTime} min read`;
    this.statUpdated.textContent = 'Auto-saved';
  }

  triggerSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      if (this.onUpdateItem && this.currentItem) {
        this.onUpdateItem(this.currentItem);
      }
      this.saveIndicator.style.opacity = '1';
      setTimeout(() => {
        this.saveIndicator.style.opacity = '0';
      }, 1500);
    }, 250);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  focus() {
    if (this.textarea) {
      this.textarea.focus();
    }
  }
}
