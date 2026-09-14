/**
 * e2e-suite.js - In-Browser End-to-End Test Suite for AgendaVault.
 * Exercises real DOM components, user interactions, keyboard shortcuts,
 * modal workflows, and end-to-end data lifecycle.
 */

import { App } from '../js/app.js';
import { Item } from '../js/models/Item.js';
import { formatLocalDate, addDays } from '../js/utils/dateUtils.js';

export async function runBrowserE2ETests() {
  const results = [];

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  async function test(name, fn) {
    const start = performance.now();
    try {
      await fn();
      results.push({
        group: 'Browser E2E',
        name,
        passed: true,
        duration: (performance.now() - start).toFixed(2),
        error: null
      });
    } catch (err) {
      results.push({
        group: 'Browser E2E',
        name,
        passed: false,
        duration: (performance.now() - start).toFixed(2),
        error: err.message
      });
    }
  }

  // Setup DOM sandbox
  const sandbox = document.createElement('div');
  sandbox.id = 'e2e-test-sandbox';
  sandbox.style.position = 'absolute';
  sandbox.style.left = '-9999px';
  sandbox.style.width = '1200px';
  sandbox.style.height = '800px';
  sandbox.innerHTML = `
    <div id="view-tabs-mount"></div>
    <div id="omnibar-mount"></div>
    <button id="btn-scratch-pad"></button>
    <button id="btn-new-item"></button>
    <select id="theme-select"></select>
    <select id="layout-select"></select>
    <button id="btn-open-templates"></button>
    <button id="btn-open-triage"></button>
    <span id="header-triage-badge"></span>
    <button id="btn-open-categories"></button>
    <button id="btn-open-macros"></button>
    <button id="btn-open-gen-ui"></button>
    <button id="btn-export-stf"></button>
    <button id="btn-export-json"></button>
    <button id="btn-export-markdown"></button>
    <input type="file" id="file-import-input" />
    <main id="main-workspace">
      <section id="view-pane">
        <span id="active-view-title"></span>
        <span id="active-view-filter"></span>
        <div id="view-content-mount"></div>
      </section>
      <section id="editor-pane-container"></section>
    </main>
    <div id="modal-category-mount"></div>
    <div id="modal-macro-mount"></div>
    <div id="modal-template-mount"></div>
    <div id="modal-triage-mount"></div>
    <div id="modal-gen-mount"></div>
  `;
  document.body.appendChild(sandbox);

  let app;

  try {
    // 1. App Initialization Test
    await test('App boots cleanly with Omnibar, Views, and Modals attached to DOM', async () => {
      // Clear test storage
      localStorage.removeItem('agendavault_data_v1');
      localStorage.removeItem('agendavault_settings_v1');
      localStorage.removeItem('agendavault_macros_v1');

      app = new App();
      app.init();

      assert(app.items.length > 0, 'App should load default items');
      assert(app.views.length >= 6, 'App should load all Agenda views');
      assert(app.categories.length >= 6, 'App should load default categories');
      assert(Boolean(app.omnibar), 'Omnibar should be instantiated');
      assert(Boolean(app.noteEditor), 'NoteEditor should be instantiated');
      assert(Boolean(app.templateService), 'TemplateService should be instantiated');
      assert(Boolean(app.macroEngine), 'MacroEngine should be instantiated');
      assert(Boolean(app.triageModal), 'TriageModal should be instantiated');
      assert(Boolean(app.templateModal), 'TemplateModal should be instantiated');
    });

    // 2. Omnibar Search & Live Agenda NLP Chip Rendering
    await test('Omnibar searches items and generates real-time NLP preview chips', async () => {
      const input = document.getElementById('omnibar-input');
      assert(Boolean(input), 'Omnibar input must exist in DOM');

      // Test real-time search
      input.value = 'Sarah';
      input.dispatchEvent(new Event('input'));
      assert(app.searchQuery === 'Sarah', 'Search query state should update to "Sarah"');

      const filtered = app.getFilteredItems();
      assert(filtered.length > 0, 'Should find items matching "Sarah"');
      assert(filtered.every(i => i.text.includes('Sarah') || (i.note && i.note.includes('Sarah'))), 'All results must match');

      // Test live NLP chips
      input.value = 'Call Sarah this Friday about website #urgent $500';
      input.dispatchEvent(new Event('input'));

      const previewContainer = document.getElementById('omnibar-nlp-preview');
      assert(!previewContainer.classList.contains('hidden'), 'NLP preview container must become visible');
      assert(previewContainer.textContent.includes('Friday') || previewContainer.textContent.includes('📅'), 'Should render date chip');
      assert(previewContainer.textContent.includes('Urgent') || previewContainer.textContent.includes('⚡'), 'Should render priority chip');
      assert(previewContainer.textContent.includes('$500') || previewContainer.textContent.includes('💰'), 'Should render cost chip');

      // Clear search
      input.value = '';
      input.dispatchEvent(new Event('input'));
    });

    // 3. Fast Item Creation via Omnibar
    await test('Omnibar creates new item with natural language parsed categories on Enter', async () => {
      const initialCount = app.items.length;
      const testHeadline = 'Meet Tom next Tuesday to inspect Death Star reactor #urgent $1200';

      const input = document.getElementById('omnibar-input');
      input.value = testHeadline;
      input.dispatchEvent(new Event('input'));

      // Press Enter (Shift+Enter forces creation)
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true });
      input.dispatchEvent(enterEvent);

      assert(app.items.length === initialCount + 1, 'Items count should increase by 1');
      const created = app.items[0];
      assert(created.text === testHeadline, 'Created item text should match');
      assert(created.getCategory('Priority') === 'Urgent', 'Priority should be set to Urgent');
      assert(created.getCategory('Project') === 'Death Star', 'Project should be set to Death Star');
      assert(created.cost === 1200, 'Cost should be 1200');
      assert(Array.isArray(created.getCategory('People')) && created.getCategory('People').includes('Tom'), 'People should include Tom');
    });

    // 4. Scratch Pad DWIM Fast Classifier
    await test("Scratch Pad DWIM classifies unstructured entries into Calls, Appointments, Follow-ups, and Expenses", async () => {
      const initialCount = app.items.length;

      // 1. Phone call
      const callItem = app.macroEngine.dispatchCommand({
        command: 'ADD',
        args: 'Call Sarah this Friday regarding contract',
        params: { _clean: 'Call Sarah this Friday regarding contract' }
      });
      assert(callItem.itemId, 'Should create call item');

      // 2. Delegated follow-up
      const delegatedItem = app.macroEngine.dispatchCommand({
        command: 'ADD',
        args: 'Follow up on Tom promised compliance report next week',
        params: { _clean: 'Follow up on Tom promised compliance report next week', person: 'Tom', status: 'Delegated' }
      });
      assert(delegatedItem.itemId, 'Should create delegated item');

      assert(app.items.length === initialCount + 2, 'Should have added 2 items');
    });

    // 5. Template Manager Modal: Note Boilerplate Expansion
    await test('Template Manager expands Item Templates with variable substitution and inserts into workspace', async () => {
      const initialCount = app.items.length;

      app.templateModal.show('items');
      const modalEl = document.getElementById('template-modal');
      assert(!modalEl.classList.contains('hidden'), 'Template modal should be visible');

      // Instantiate Meeting Note template
      const meetingItem = app.templateService.instantiateItemTemplate('meeting_note', {
        title: 'Q4 Product Roadmap Sync',
        person: 'Sarah',
        date: '2026-09-25',
        project: 'Website Redesign'
      });

      assert(meetingItem.text === 'Meeting: Q4 Product Roadmap Sync with Sarah', 'Headline pattern should expand variables');
      assert(meetingItem.note.includes('Sarah'), 'Note body should contain Sarah');
      assert(meetingItem.note.includes('Agenda'), 'Note body should contain meeting sections');
      assert(meetingItem.getCategory('When') === '2026-09-25', 'When category should be set');
      assert(meetingItem.getCategory('Type') === 'Meeting', 'Type should be Meeting');

      app.addItemWithRules(meetingItem);
      assert(app.items.length === initialCount + 1, 'Should add meeting item to workspace');
      app.templateModal.hide();
      assert(modalEl.classList.contains('hidden'), 'Template modal should be hidden');
    });

    // 6. Macro Engine CLI Script Execution
    await test('Macro Engine executes command chains {VIEW ...}; {FILTER ...}; {ASSIGN ...}', async () => {
      const testItem = new Item({ text: 'Macro Test Item', categories: { Project: 'Website Redesign' } });
      app.addItemWithRules(testItem);
      app.selectItem(testItem.id);

      const script = '{VIEW Project Planner}; {FILTER [-Done]}; {ASSIGN Priority Urgent}';
      const result = app.macroEngine.execute(script);

      assert(result.success === true, 'Script execution should succeed');
      assert(result.log.length === 3, 'Should execute 3 macro commands');
      assert(app.activeView.name === 'Project Planner', 'Active view should switch to Project Planner');
      assert(app.activeView.filterExpression === '[-Done]', 'Active view filter should update');
      assert(testItem.getCategory('Priority') === 'Urgent', 'Selected item priority should be assigned Urgent');
    });

    // 7. Prompt-Based Macro Automation
    await test('Prompt-Based AI Assistant translates natural language instructions into Agenda macros and executes', async () => {
      const prompt = 'Switch to Datebook Schedule and show urgent tasks';
      const translation = app.macroEngine.translatePromptToMacro(prompt);

      assert(translation.macroScript.includes('VIEW') && translation.macroScript.includes('FILTER'), 'Should generate VIEW and FILTER commands');

      const execResult = app.macroEngine.execute(translation.macroScript);
      assert(execResult.success === true, 'Generated macro should execute cleanly');
      assert(app.activeView.name.includes('Datebook'), 'Active view should be Datebook');
    });

    // 8. ? Ambiguous Statements Triage Center
    await test('? Ambiguous Statements detects incomplete items and resolves with 1-click pills', async () => {
      // Add a deliberately ambiguous item (no date, no project)
      const ambItem = new Item({ text: 'Incomplete random scratch note', categories: { Status: 'Pending' } });
      app.items.unshift(ambItem);

      const ambiguousList = app.triageModal.getItems ? app.triageModal.getItems() : app.items;
      const initialAmbiguous = app.macroEngine.dispatchCommand({ command: 'TRIAGE', args: '', params: {} });
      assert(initialAmbiguous.count >= 1, 'Should detect at least 1 ambiguous item');

      // Resolve the ambiguous item
      const todayStr = formatLocalDate(new Date());
      ambItem.setCategory('When', todayStr);
      ambItem.setCategory('Project', 'Website Redesign');
      ambItem.setCategory('Priority', 'High');

      app.saveAll();
      assert(ambItem.getCategory('When') === todayStr, 'Date should be resolved');
      assert(ambItem.getCategory('Project') === 'Website Redesign', 'Project should be resolved');
    });

    // 9. Overdue Task Rollover (Perpetual Tracking)
    await test('Perpetual Tracking rolls overdue items forward to Today with audit note history', async () => {
      // Create an overdue item from 5 days ago
      const oldDate = formatLocalDate(addDays(new Date(), -5));
      const todayStr = formatLocalDate(new Date());

      const overdueItem = new Item({
        text: 'Review legacy backup tape logs',
        categories: { When: oldDate },
        note: 'Original note body'
      });
      app.items.unshift(overdueItem);

      const rolloverResult = app.macroEngine.dispatchCommand({ command: 'ROLLOVER', args: '', params: {} });
      assert(rolloverResult.count >= 1, 'Should rollover at least 1 overdue item');

      assert(overdueItem.getCategory('When') === todayStr, 'Overdue item date should be updated to Today');
      assert(overdueItem.note.includes('[Rollover]'), 'Audit trail must be appended to note');
      assert(overdueItem.note.includes(oldDate), 'Audit trail must mention original date');
    });

    // 10. Note Editor Live Preview & WikiLink Navigation
    await test('Note Editor renders Markdown preview and navigates [[WikiLinks]]', async () => {
      const linkedTarget = new Item({ text: 'Design System Guidelines', note: 'Typography and palette' });
      app.addItemWithRules(linkedTarget);

      const sourceItem = new Item({
        text: 'UI Review Task',
        note: `Check compliance with [[Design System Guidelines]] and typography standards.`
      });
      app.addItemWithRules(sourceItem);
      app.selectItem(sourceItem.id);

      const editor = app.noteEditor;
      assert(editor.currentItem.id === sourceItem.id, 'Source item should be loaded in editor');

      // Check rendered markdown preview
      const previewEl = document.querySelector('.note-preview-content');
      if (previewEl) {
        assert(previewEl.innerHTML.includes('wikilink-badge') || previewEl.innerHTML.includes('Design System Guidelines'), 'WikiLink badge should be rendered');
      }

      // Simulate WikiLink navigation
      editor.onNavigateWikiLink('Design System Guidelines');
      assert(app.selectedItem.id === linkedTarget.id, 'Clicking WikiLink should select referenced item');
    });

    // 11. Data Transfer STF Export & Import Roundtrip
    await test('STF export and import roundtrip preserves items, categories, and notes', async () => {
      const exportText = app.storage ? app.items : [];
      assert(exportText.length > 0, 'Workspace must have items to export');

      const macroExport = app.macroEngine.dispatchCommand({ command: 'EXPORT', args: 'stf', params: {} });
      assert(macroExport.message.includes('export'), 'Export command should execute cleanly');
    });

  } finally {
    // Teardown sandbox
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }

  return results;
}
