/**
 * e2e-suite.js - In-Browser End-to-End Test Suite for AgendaVault.
 * Exercises real DOM components, user interactions, keyboard shortcuts,
 * modal workflows, and end-to-end data lifecycle.
 */

import { App } from '../js/app.js';
import { Item } from '../js/models/Item.js';
import { DataUtilities } from '../js/services/dataUtilities.js';
import { STFService } from '../js/services/stfService.js';
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
      const callItem = DataUtilities.classifyScratchPadText('Call Sarah this Friday regarding contract', app.nlpEngine);
      assert(callItem.getCategory('Type') === 'Call', 'Should classify as Call');
      assert(callItem.getCategory('People') && callItem.getCategory('People').includes('Sarah'), 'Should parse person Sarah');
      app.addItemWithRules(callItem);

      // 2. Delegated follow-up
      const delegatedItem = DataUtilities.classifyScratchPadText('Tom promised compliance report next week', app.nlpEngine);
      assert(delegatedItem.getCategory('Type') === 'Follow-up', 'Should classify as Follow-up');
      assert(delegatedItem.getCategory('Status') === 'Delegated', 'Should set status to Delegated');
      assert(delegatedItem.getCategory('DelegatedTo') === 'Tom', 'Should set DelegatedTo Tom');
      app.addItemWithRules(delegatedItem);

      // 3. Expense
      const expenseItem = DataUtilities.classifyScratchPadText('Lunch receipt with client $55.00', app.nlpEngine);
      assert(expenseItem.getCategory('Type') === 'Expense', 'Should classify as Expense');
      assert(expenseItem.cost === 55, 'Should parse cost 55');
      app.addItemWithRules(expenseItem);

      assert(app.items.length === initialCount + 3, 'Should have added 3 DWIM classified items');
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
    await test('? Ambiguous Statements detects incomplete items and resolves with 1-click pills and dismissal', async () => {
      // Add deliberately ambiguous items
      const ambItem1 = new Item({ text: 'Incomplete random scratch note', categories: { Status: 'Pending' } });
      const ambItem2 = new Item({ text: 'Dismissable vague task', categories: { Status: 'Pending' } });
      app.items.unshift(ambItem1, ambItem2);

      app.triageModal.show();
      const modalEl = document.getElementById('triage-modal');
      assert(!modalEl.classList.contains('hidden'), 'Triage modal must be visible');

      // Test clicking 1-click pill for When on ambItem1
      const whenPill = modalEl.querySelector(`.pill-resolve[data-id="${ambItem1.id}"][data-cat="when"]`);
      assert(Boolean(whenPill), 'When pill must exist for ambiguous card');
      whenPill.click();
      assert(Boolean(ambItem1.getCategory('When')), 'Clicking When pill should set date on item');

      // Test clicking Dismiss button on ambItem2
      const dismissBtn = modalEl.querySelector(`.btn-dismiss-triage[data-id="${ambItem2.id}"]`);
      assert(Boolean(dismissBtn), 'Dismiss button must exist on ambiguous card');
      dismissBtn.click();
      assert(ambItem2.getCategory('Ambiguous') === 'Dismissed', 'Dismiss button should mark item as Dismissed');

      // Verify ambItem2 no longer appears in ambiguous list
      const ambListAfterDismiss = DataUtilities.findAmbiguousItems(app.items);
      assert(!ambListAfterDismiss.some(i => i.item.id === ambItem2.id), 'Dismissed item must not be in ambiguous list');

      // Test Auto-Resolve All button
      const autoResolveBtn = document.getElementById('btn-triage-resolve-all');
      assert(Boolean(autoResolveBtn), 'Auto-Resolve All button must exist');
      autoResolveBtn.click();

      const remainingAmbiguous = DataUtilities.findAmbiguousItems(app.items);
      assert(remainingAmbiguous.length === 0, 'Auto-resolve all should clear all remaining ambiguous items');

      app.triageModal.hide();
      assert(modalEl.classList.contains('hidden'), 'Triage modal should hide');
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
      const previewEl = document.querySelector('#markdown-output');
      assert(Boolean(previewEl), '#markdown-output element must exist in DOM');
      assert(previewEl.innerHTML.includes('wikilink') && previewEl.innerHTML.includes('Design System Guidelines'), 'WikiLink badge should be rendered in preview');

      // Simulate WikiLink navigation
      editor.onNavigateWikiLink('Design System Guidelines');
      assert(app.selectedItem.id === linkedTarget.id, 'Clicking WikiLink should select referenced item');
    });

    // 11. Data Transfer STF Export & Import Roundtrip
    await test('STF export and import roundtrip preserves items, categories, and notes', async () => {
      assert(app.items.length > 0, 'Workspace must have items to export');

      // Export items and categories to STF format
      const stfText = STFService.exportToSTF(app.items, app.categories);
      assert(typeof stfText === 'string' && stfText.length > 0, 'STF export must produce non-empty string');
      assert(stfText.includes('\\Items\\') && stfText.includes('\\Categories\\'), 'STF output must contain Items and Categories headers');

      // Import STF into parsed data
      const imported = STFService.importFromSTF(stfText);
      assert(imported.items.length === app.items.length, `Expected ${app.items.length} imported items, got ${imported.items.length}`);

      // Verify individual item attributes survived roundtrip
      const sourceSample = app.items[0];
      const matchSample = imported.items.find(i => i.text === sourceSample.text);
      assert(Boolean(matchSample), `Should find item "${sourceSample.text}" in imported STF items`);
      if (sourceSample.note) {
        assert(matchSample.note === sourceSample.note, 'Note content must match after roundtrip');
      }
    });

  } finally {
    // Teardown sandbox
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }

  return results;
}
