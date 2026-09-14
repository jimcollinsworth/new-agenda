/**
 * test-suite.js - Comprehensive Unit & Integration Tests for AgendaVault.
 * Tests Lotus Agenda NLP, Filter expressions, Category Rules, STF format roundtrip,
 * nvALT search & creation, timezone safety, and completion date ranges.
 */

import { Item } from '../js/models/Item.js';
import { Category, CategoryValue } from '../js/models/Category.js';
import { Rule } from '../js/models/Rule.js';
import { View } from '../js/models/View.js';
import { WorkspaceTemplate, ItemTemplate } from '../js/models/Template.js';
import { NLPEngine } from '../js/services/nlpEngine.js';
import { FilterEngine } from '../js/services/filterEngine.js';
import { STFService } from '../js/services/stfService.js';
import { TemplateService } from '../js/services/templateService.js';
import { MacroEngine } from '../js/services/macroEngine.js';
import { DataUtilities } from '../js/services/dataUtilities.js';
import { StorageService } from '../js/services/storageService.js';
import { getPersonalSampleVaultData } from '../data/personalSampleVault.js';
import { formatLocalDate, addDays, parseLocalDate } from '../js/utils/dateUtils.js';

// Polyfill localStorage in test environments where not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

export async function runAllTests() {
  const results = [];

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  function test(group, name, fn) {
    const start = performance.now();
    try {
      fn();
      results.push({
        group,
        name,
        passed: true,
        duration: (performance.now() - start).toFixed(2),
        error: null
      });
    } catch (err) {
      results.push({
        group,
        name,
        passed: false,
        duration: (performance.now() - start).toFixed(2),
        error: err.message
      });
    }
  }

  // --- 1. Date Utils & Timezone Safety Tests ---
  test('Date Utils', 'Timezone-safe local date formatting and parsing', () => {
    // Construct test dates at midnight
    const d = new Date(2026, 8, 15, 0, 0, 0); // Sept 15, 2026
    const str = formatLocalDate(d);
    assert(str === '2026-09-15', `Expected 2026-09-15, got ${str}`);

    const parsed = parseLocalDate('2026-09-15');
    assert(parsed.getFullYear() === 2026, 'Year must match');
    assert(parsed.getMonth() === 8, 'Month must match September');
    assert(parsed.getDate() === 15, 'Date must match 15');

    const added = addDays(parsed, 7);
    assert(formatLocalDate(added) === '2026-09-22', 'Adding 7 days should be 2026-09-22');

    // Leap year test
    const leapDate = parseLocalDate('2028-02-28');
    const nextDay = addDays(leapDate, 1);
    assert(formatLocalDate(nextDay) === '2028-02-29', `Expected leap day 2028-02-29, got ${formatLocalDate(nextDay)}`);
  });

  // --- 2. Item Model Tests ---
  test('Item Model', 'Create Item and manage category attributes', () => {
    const item = new Item({ text: 'Test Agenda Task' });
    assert(item.text === 'Test Agenda Task', 'Item headline should match');
    assert(item.done === false, 'New item should not be done');

    item.setCategory('When', '2026-09-20');
    assert(item.getCategory('When') === '2026-09-20', 'When category should be set');

    item.addCategoryValue('People', 'Sarah');
    item.addCategoryValue('People', 'Tom');
    const people = item.getCategory('People');
    assert(Array.isArray(people) && people.length === 2, 'People should contain 2 values');
    assert(people.includes('Sarah') && people.includes('Tom'), 'People should contain Sarah and Tom');

    item.toggleDone();
    assert(item.done === true, 'Toggle done should mark item as true');
    assert(Boolean(item.getCategory('Done')), 'Done category should record completion date');
    assert(item.getCategory('Status') === 'Done', 'Status category should be Done');

    item.toggleDone();
    assert(item.done === false, 'Toggle done again should mark item as false');
    assert(item.getCategory('Done') === null, 'Done category should be removed');
  });

  test('Item Model', 'JSON serialization roundtrip', () => {
    const item = new Item({
      text: 'Death Star Maintenance',
      note: 'Check reactor port',
      categories: { Project: 'Death Star', Priority: 'Urgent' },
      cost: 5000
    });

    const json = item.toJSON();
    const revived = Item.fromJSON(json);

    assert(revived.text === item.text, 'Text should match after serialization');
    assert(revived.note === item.note, 'Note should match');
    assert(revived.cost === 5000, 'Cost should match');
    assert(revived.getCategory('Priority') === 'Urgent', 'Category should match');
  });

  // --- 3. NLP Engine Tests ---
  const refDate = new Date(2026, 8, 15, 12, 0, 0); // Tuesday, Sept 15, 2026

  test('NLP Engine', 'Parse relative dates: today, tomorrow, yesterday, weekend, next week', () => {
    const nlp = new NLPEngine();

    const todayRes = nlp.parse('File taxes today', refDate);
    assert(todayRes.when === '2026-09-15', `Expected 2026-09-15, got ${todayRes.when}`);

    const tomorrowRes = nlp.parse('Deploy release tomorrow', refDate);
    assert(tomorrowRes.when === '2026-09-16', `Expected 2026-09-16, got ${tomorrowRes.when}`);

    const yesterdayRes = nlp.parse('Finished audit yesterday', refDate);
    assert(yesterdayRes.when === '2026-09-14', `Expected 2026-09-14, got ${yesterdayRes.when}`);

    const twoDaysAgoRes = nlp.parse('Met client day before yesterday', refDate);
    assert(twoDaysAgoRes.when === '2026-09-13', `Expected 2026-09-13, got ${twoDaysAgoRes.when}`);

    // "this weekend" from Tuesday Sept 15, 2026 -> Saturday Sept 19, 2026
    const weekendRes = nlp.parse('Call Mom this weekend', refDate);
    assert(weekendRes.when === '2026-09-19', `Expected 2026-09-19 for weekend, got ${weekendRes.when}`);

    // "next week" -> +7 days -> Sept 22, 2026
    const nextWeekRes = nlp.parse('Ship product next week', refDate);
    assert(nextWeekRes.when === '2026-09-22', `Expected 2026-09-22 for next week, got ${nextWeekRes.when}`);

    // "end of week" -> Friday Sept 18, 2026
    const endOfWeekRes = nlp.parse('Wrap up report end of week', refDate);
    assert(endOfWeekRes.when === '2026-09-18', `Expected 2026-09-18 for end of week, got ${endOfWeekRes.when}`);

    // "end of month" -> Sept 30, 2026
    const endOfMonthRes = nlp.parse('Reconcile accounts end of month', refDate);
    assert(endOfMonthRes.when === '2026-09-30', `Expected 2026-09-30 for end of month, got ${endOfMonthRes.when}`);
  });

  test('NLP Engine', 'Parse time intervals and relative offsets', () => {
    const nlp = new NLPEngine();

    const weekRes = nlp.parse('Sprint planning a week from today', refDate);
    assert(weekRes.when === '2026-09-22', `Expected 2026-09-22, got ${weekRes.when}`);

    const inDaysRes = nlp.parse('Submit proposal in 4 days', refDate);
    assert(inDaysRes.when === '2026-09-19', `Expected 2026-09-19, got ${inDaysRes.when}`);

    const inWeeksRes = nlp.parse('Quarterly review in 2 weeks', refDate);
    assert(inWeeksRes.when === '2026-09-29', `Expected 2026-09-29, got ${inWeeksRes.when}`);

    const daysAgoRes = nlp.parse('Shipped order 3 days ago', refDate);
    assert(daysAgoRes.when === '2026-09-12', `Expected 2026-09-12, got ${daysAgoRes.when}`);

    const inAWeekRes = nlp.parse('Ship feature in a week', refDate);
    assert(inAWeekRes.when === '2026-09-22', `Expected 2026-09-22 for in a week, got ${inAWeekRes.when}`);

    const twoWeeksAgoRes = nlp.parse('Completed spec two weeks ago', refDate);
    assert(twoWeeksAgoRes.when === '2026-09-01', `Expected 2026-09-01 for two weeks ago, got ${twoWeeksAgoRes.when}`);
  });

  test('NLP Engine', 'Parse weekdays and recurring schedules', () => {
    const nlp = new NLPEngine();

    // Ref date is Tuesday, Sept 15, 2026. "this Friday" -> Sept 18, 2026
    const fridayRes = nlp.parse('Call Sarah this Friday', refDate);
    assert(fridayRes.when === '2026-09-18', `Expected 2026-09-18 for this Friday, got ${fridayRes.when}`);

    // Ref date is Tuesday, Sept 15, 2026. "this Tuesday" -> Sept 15, 2026 (Today)
    const tuesdayRes = nlp.parse('Sync with team this Tuesday', refDate);
    assert(tuesdayRes.when === '2026-09-15', `Expected 2026-09-15 for this Tuesday, got ${tuesdayRes.when}`);

    // Ref date is Tuesday, Sept 15, 2026. "next Tuesday" -> Sept 22, 2026 (+7 days)
    const nextTuesdayRes = nlp.parse('Review feedback next Tuesday', refDate);
    assert(nextTuesdayRes.when === '2026-09-22', `Expected 2026-09-22 for next Tuesday, got ${nextTuesdayRes.when}`);

    // "every four months starting Tuesday"
    const recRes = nlp.parse('Check data retention policy every four months starting Tuesday', refDate);
    assert(recRes.recurrence && recRes.recurrence.toLowerCase().includes('every four months'), 'Should extract recurrence');
  });

  test('NLP Engine', 'Parse entities: People, Projects, Priorities, Costs, and Tags', () => {
    const sampleCategories = [
      new Category({
        name: 'People',
        values: [new CategoryValue({ name: 'Sarah', keywords: ['sarah'] })]
      }),
      new Category({
        name: 'Project',
        values: [new CategoryValue({ name: 'Death Star', keywords: ['death star'] })]
      })
    ];

    const nlp = new NLPEngine({ categories: sampleCategories });

    const complex = nlp.parse('Call Sarah this Friday to inspect Death Star superlaser $1,250 #urgent', refDate);
    assert(complex.people.includes('Sarah'), 'Should identify person Sarah');
    assert(complex.project === 'Death Star', 'Should identify project Death Star');
    assert(complex.cost === 1250, `Expected cost 1250, got ${complex.cost}`);
    assert(complex.priority === 'Urgent', `Expected priority Urgent, got ${complex.priority}`);
    assert(complex.tags.includes('urgent'), 'Should extract tag');

    // Natural people extraction ("Call Sarah and Tom")
    const twoPeople = nlp.parse('Call Sarah and Tom about architecture review', refDate);
    assert(twoPeople.people.includes('Sarah') && twoPeople.people.includes('Tom'), 'Should extract both Sarah and Tom');
  });

  // --- 4. Agenda Filter Engine Tests ---
  test('Filter Engine', 'Parse and evaluate Agenda expressions [-Done, When(<- > A week from today)]', () => {
    const engine = new FilterEngine();

    const items = [
      new Item({ text: 'Task 1', categories: { When: '2026-09-18' }, done: false }), // In 3 days (within week)
      new Item({ text: 'Task 2', categories: { When: '2026-09-30' }, done: false }), // In 15 days (outside week)
      new Item({ text: 'Task 3', categories: { When: '2026-09-18' }, done: true }),  // Done
      new Item({ text: 'Task 4', done: false })                                      // No date
    ];

    // Space-tolerant arrow syntax: "<- >"
    const filtered1 = engine.filterItems(items, '[-Done, When(<- > A week from today)]', '', refDate);
    assert(filtered1.length === 1, `Expected 1 matching item with "<- >", got ${filtered1.length}`);
    assert(filtered1[0].text === 'Task 1', `Expected Task 1, got ${filtered1[0].text}`);

    // Standard arrow syntax: "<->"
    const filtered2 = engine.filterItems(items, '[-Done, When(<-> A week from today)]', '', refDate);
    assert(filtered2.length === 1, `Expected 1 matching item with "<->", got ${filtered2.length}`);

    // Leading arrow syntax: "<-"
    const filtered3 = engine.filterItems(items, '[-Done, When(<- A week from today)]', '', refDate);
    assert(filtered3.length === 1, `Expected 1 matching item with "<-", got ${filtered3.length}`);

    // Leading arrow syntax with "->": "->"
    const filtered4 = engine.filterItems(items, '[-Done, When(-> A week from today)]', '', refDate);
    assert(filtered4.length === 1, `Expected 1 matching item with "->", got ${filtered4.length}`);

    // Space-tolerant arrow syntax with hyphens: "<- ->"
    const filtered5 = engine.filterItems(items, '[-Done, When(<- -> A week from today)]', '', refDate);
    assert(filtered5.length === 1, `Expected 1 matching item with "<- ->", got ${filtered5.length}`);
  });

  test('Filter Engine', 'Evaluate Agenda Done completion date ranges [Done(2 days ago <->)]', () => {
    const engine = new FilterEngine();

    const items = [
      new Item({ text: 'Done yesterday', done: true, categories: { Done: '2026-09-14' } }),
      new Item({ text: 'Done long ago', done: true, categories: { Done: '2026-08-01' } }),
      new Item({ text: 'Incomplete item', done: false })
    ];

    const filtered = engine.filterItems(items, '[Done(2 days ago <->)]', '', refDate);
    assert(filtered.length === 1, `Expected 1 recent done item, got ${filtered.length}`);
    assert(filtered[0].text === 'Done yesterday', `Expected "Done yesterday", got ${filtered[0].text}`);
  });

  test('Filter Engine', 'Evaluate Agenda helper expressions: [When(Today)], [When(Overdue)]', () => {
    const engine = new FilterEngine();

    const items = [
      new Item({ text: 'Overdue task', categories: { When: '2026-09-10' } }),
      new Item({ text: 'Today task', categories: { When: '2026-09-15' } }),
      new Item({ text: 'Tomorrow task', categories: { When: '2026-09-16' } })
    ];

    const overdue = engine.filterItems(items, '[When(Overdue)]', '', refDate);
    assert(overdue.length === 1 && overdue[0].text === 'Overdue task', 'Should match overdue item');

    const today = engine.filterItems(items, '[When(Today)]', '', refDate);
    assert(today.length === 1 && today[0].text === 'Today task', 'Should match today item');
  });

  test('Filter Engine', 'Evaluate [-Done, -When] (Undated incomplete tasks)', () => {
    const engine = new FilterEngine();

    const items = [
      new Item({ text: 'Dated task', categories: { When: '2026-09-18' }, done: false }),
      new Item({ text: 'Undated task 1', done: false }),
      new Item({ text: 'Undated task 2 (done)', done: true })
    ];

    const filtered = engine.filterItems(items, '[-Done, -When]', '', refDate);
    assert(filtered.length === 1, `Expected 1 matching item, got ${filtered.length}`);
    assert(filtered[0].text === 'Undated task 1', `Expected Undated task 1, got ${filtered[0].text}`);
  });

  test('Filter Engine', 'Evaluate category inclusion/exclusion [+Priority:High, -Status:Done]', () => {
    const engine = new FilterEngine();

    const items = [
      new Item({ text: 'Item A', categories: { Priority: 'High', Status: 'Pending' } }),
      new Item({ text: 'Item B', categories: { Priority: 'High', Status: 'Done' } }),
      new Item({ text: 'Item C', categories: { Priority: 'Low', Status: 'Pending' } })
    ];

    const filtered = engine.filterItems(items, '[+Priority:High, -Status:Done]', '', refDate);
    assert(filtered.length === 1, `Expected 1 match, got ${filtered.length}`);
    assert(filtered[0].text === 'Item A', `Expected Item A, got ${filtered[0].text}`);

    // Agenda Category(Value) syntax
    const filteredAgenda = engine.filterItems(items, '[Priority(High), -Status:Done]', '', refDate);
    assert(filteredAgenda.length === 1 && filteredAgenda[0].text === 'Item A', 'Should match Agenda Category(Value) syntax');
  });

  test('Filter Engine', 'nvALT search with exact quotes and tags', () => {
    const engine = new FilterEngine();

    const items = [
      new Item({ text: 'Deploy Death Star battlestation', note: 'Check thermal port' }),
      new Item({ text: 'Call Sarah regarding proposal', note: 'Discuss timelines' }),
      new Item({ text: 'Review cloud expenses', categories: { Tags: ['finance'] } }),
      new Item({ text: 'Single tag item', categories: { Tags: 'security' } })
    ];

    // Search inside note
    const search1 = engine.filterItems(items, '', 'thermal');
    assert(search1.length === 1 && search1[0].text.includes('Death Star'), 'Should find in note text');

    // Multi-term search with quotes
    const searchQuotes = engine.filterItems(items, '', 'deploy "Death Star"');
    assert(searchQuotes.length === 1, 'Should find item matching quoted phrase');

    // Array tag search
    const searchTag1 = engine.filterItems(items, '', '#finance');
    assert(searchTag1.length === 1 && searchTag1[0].text.includes('cloud expenses'), 'Should match array tag');

    // Single string tag search
    const searchTag2 = engine.filterItems(items, '', '#security');
    assert(searchTag2.length === 1 && searchTag2[0].text.includes('Single tag item'), 'Should match single tag');
  });

  test('Filter Engine', 'Evaluate [Ambiguous] filter and [-When | -Project] OR filter expression', () => {
    const engine = new FilterEngine();
    const items = [
      new Item({ text: 'Complete item', categories: { When: '2026-09-20', Project: 'Website', Priority: 'High' } }),
      new Item({ text: 'Missing date only', categories: { Project: 'Website', Priority: 'Medium' } }),
      new Item({ text: 'Missing project only', categories: { When: '2026-09-20', Priority: 'Low' } }),
      new Item({ text: 'Explicitly dismissed ambiguous item', categories: { Ambiguous: 'Dismissed' } }),
      new Item({ text: 'Completed undated item', done: true })
    ];

    // [Ambiguous] virtual filter
    const ambiguousResults = engine.filterItems(items, '[Ambiguous]');
    assert(ambiguousResults.length === 2, `Expected 2 ambiguous items, got ${ambiguousResults.length}`);
    assert(ambiguousResults.some(i => i.text === 'Missing date only'), 'Should include missing date');
    assert(ambiguousResults.some(i => i.text === 'Missing project only'), 'Should include missing project');
    assert(!ambiguousResults.some(i => i.text === 'Explicitly dismissed ambiguous item'), 'Should exclude dismissed item');

    // [-When | -Project] OR expression
    const orResults = engine.filterItems(items, '[-When | -Project]');
    assert(orResults.length >= 2, `Expected at least 2 matching OR items, got ${orResults.length}`);
  });

  // --- 5. Assignment Rules Engine Tests ---
  test('Assignment Rules', 'Auto-classify items and prioritize higher priority rules', () => {
    const rule1 = new Rule({
      name: 'Calls -> Type: Call',
      conditionType: 'text_contains',
      conditionValue: 'call',
      targetCategory: 'Type',
      targetValue: 'Call',
      priority: 5
    });

    const rule2 = new Rule({
      name: 'Death Star -> Priority: Urgent',
      conditionType: 'category_is',
      conditionParam: 'Project',
      conditionValue: 'Death Star',
      targetCategory: 'Priority',
      targetValue: 'Urgent',
      priority: 20
    });

    const item = new Item({
      text: 'Call commander about reactor shield',
      categories: { Project: 'Death Star' }
    });

    assert(rule1.matches(item), 'Rule 1 should match call in text');
    rule1.apply(item);
    assert(item.getCategory('Type') === 'Call', 'Type should be Call');

    assert(rule2.matches(item), 'Rule 2 should match Project: Death Star');
    rule2.apply(item);
    assert(item.getCategory('Priority') === 'Urgent', 'Priority should be Urgent');
  });

  // --- 6. Lotus Agenda STF (Structured Text File) Roundtrip Tests ---
  test('STF Service', 'Serialize and parse STF format with multi-value categories and notes', () => {
    const categories = [
      new Category({
        name: 'Project',
        type: 'text',
        values: [new CategoryValue({ name: 'Death Star', keywords: ['death star'] })]
      }),
      new Category({
        name: 'People',
        type: 'multi',
        values: [new CategoryValue({ name: 'Tarkin' }), new CategoryValue({ name: 'Vader' })]
      })
    ];

    const items = [
      new Item({
        text: 'Deploy superlaser test',
        note: 'Requires safety clearance from Moff Tarkin.',
        categories: { Project: 'Death Star', People: ['Tarkin', 'Vader'], When: '2026-10-01' },
        cost: 250000,
        done: true
      })
    ];

    const stfOutput = STFService.exportToSTF(items, categories);
    assert(stfOutput.includes('\\Items\\'), 'STF should contain Items section');
    assert(stfOutput.includes('\\CatVal\\Project\\Death Star\\'), 'STF should contain Project CatVal');
    assert(stfOutput.includes('\\CatVal\\People\\Tarkin\\'), 'STF should contain People CatVal');
    assert(stfOutput.includes('\\Done\\1\\'), 'STF should record Done status');
    assert(stfOutput.includes('\\Cost\\250000\\'), 'STF should record Cost');
    assert(stfOutput.includes('\\Note\\'), 'STF should record Note section');

    // Deserialization roundtrip
    const imported = STFService.importFromSTF(stfOutput);
    assert(imported.items.length === 1, `Expected 1 imported item, got ${imported.items.length}`);
    const importedItem = imported.items[0];
    assert(importedItem.text === 'Deploy superlaser test', 'Item text should match');
    assert(importedItem.note.includes('Moff Tarkin'), 'Note content should match');
    assert(importedItem.done === true, 'Done status should match');
    assert(importedItem.cost === 250000, 'Cost should match');
    assert(importedItem.getCategory('Project') === 'Death Star', 'Project category should match');
    assert(Array.isArray(importedItem.getCategory('People')) && importedItem.getCategory('People').includes('Tarkin'), 'People category should remain an array');
  });

  // --- 7. Macro Engine Tests ---
  test('Macro Engine', 'Parse curly brace macro syntax and parameters', () => {
    const engine = new MacroEngine(null);
    const parsed = engine.parseScript('{VIEW Datebook Schedule}; {FILTER [-Done]}; {ASSIGN Priority Urgent}; {ADD Deploy app when:2026-09-20 project:"Death Star"}');

    assert(parsed.length === 4, `Expected 4 parsed commands, got ${parsed.length}`);
    assert(parsed[0].command === 'VIEW' && parsed[0].args === 'Datebook Schedule', 'Command 0 should be VIEW');
    assert(parsed[1].command === 'FILTER' && parsed[1].args === '[-Done]', 'Command 1 should be FILTER');
    assert(parsed[2].command === 'ASSIGN' && parsed[2].args === 'Priority Urgent', 'Command 2 should be ASSIGN');
    assert(parsed[3].command === 'ADD', 'Command 3 should be ADD');
    assert(parsed[3].params.when === '2026-09-20', 'ADD when param should match');
    assert(parsed[3].params.project === 'Death Star', 'ADD project param should match');
  });

  test('Macro Engine', 'Execute macro commands on mock application', () => {
    const mockApp = {
      views: [
        new View({ id: 'v1', name: 'Main Dashboard' }),
        new View({ id: 'v2', name: 'Project Planner' })
      ],
      activeView: null,
      items: [
        new Item({ text: 'Task 1', categories: { Project: 'Website' } })
      ],
      rules: [
        new Rule({
          name: 'Urgent Flag',
          conditionType: 'text_contains',
          conditionValue: 'urgent',
          targetCategory: 'Priority',
          targetValue: 'Urgent'
        })
      ],
      selectedItem: null,
      switchView(id) { this.activeView = this.views.find(v => v.id === id); },
      addItemWithRules(item) { this.items.unshift(item); },
      selectItem(id) { this.selectedItem = this.items.find(i => i.id === id); },
      getFilteredItems() { return this.items; },
      saveAll() {},
      renderCurrentView() {}
    };
    mockApp.activeView = mockApp.views[0];
    mockApp.selectedItem = mockApp.items[0];

    const engine = new MacroEngine(mockApp);

    // Test VIEW
    engine.dispatchCommand({ command: 'VIEW', args: 'Project Planner', params: {} });
    assert(mockApp.activeView.name === 'Project Planner', 'Should switch view');

    // Test FILTER
    engine.dispatchCommand({ command: 'FILTER', args: '[+Priority:Urgent]', params: {} });
    assert(mockApp.activeView.filterExpression === '[+Priority:Urgent]', 'Should set filter expression');

    // Test ASSIGN
    engine.dispatchCommand({ command: 'ASSIGN', args: 'Priority Urgent', params: {} });
    assert(mockApp.selectedItem.getCategory('Priority') === 'Urgent', 'Should assign category to selected item');

    // Test ADD
    const addRes = engine.dispatchCommand({ command: 'ADD', args: 'Test urgent macro task', params: { _clean: 'Test urgent macro task', project: 'Website' } });
    assert(addRes.itemId, 'ADD should create item');
    assert(mockApp.items[0].text === 'Test urgent macro task', 'New item text should match');

    // Test RULES
    mockApp.items[0].text = 'Task containing urgent keyword';
    engine.dispatchCommand({ command: 'RULES', args: '', params: {} });
    assert(mockApp.items[0].getCategory('Priority') === 'Urgent', 'Rules should assign Priority: Urgent');
  });

  test('Macro Engine', 'Translate natural language prompt to Agenda macro commands', () => {
    const engine = new MacroEngine(null);

    const t1 = engine.translatePromptToMacro('roll overdue tasks to today and reapply rules');
    assert(t1.macroScript.includes('ROLLOVER') && t1.macroScript.includes('RULES'), `Expected ROLLOVER and RULES, got ${t1.macroScript}`);

    const t2 = engine.translatePromptToMacro('switch to datebook and show urgent items');
    assert(t2.macroScript.includes('VIEW Datebook') && t2.macroScript.includes('FILTER [+Priority:Urgent]'), `Expected VIEW Datebook and FILTER Urgent, got ${t2.macroScript}`);

    const t3 = engine.translatePromptToMacro('archive completed items');
    assert(t3.macroScript.includes('ARCHIVE'), `Expected ARCHIVE, got ${t3.macroScript}`);

    const t4 = engine.translatePromptToMacro('triage ambiguous items');
    assert(t4.macroScript.includes('TRIAGE'), `Expected TRIAGE, got ${t4.macroScript}`);

    const t5 = engine.translatePromptToMacro('delegate review to Sarah by Friday');
    assert(t5.macroScript.includes('DELEGATE Sarah'), `Expected DELEGATE Sarah, got ${t5.macroScript}`);
  });

  test('Macro Engine', 'Manage custom user macros with keyboard shortcuts', () => {
    const engine = new MacroEngine(null, { storageKey: 'test_custom_macros' });
    const initialLen = engine.customMacros.length;

    const added = engine.addCustomMacro({
      name: 'Custom Test Macro',
      description: 'Test description',
      script: '{VIEW Datebook}; {FILTER [-Done]}',
      shortcut: 'Alt+9'
    });
    assert(added.id, 'Should create new macro with ID');
    assert(engine.customMacros.length === initialLen + 1, 'Custom macros array should grow');

    const byShortcut = engine.getMacroByShortcut('Alt+9');
    assert(byShortcut && byShortcut.name === 'Custom Test Macro', 'Should lookup macro by shortcut');

    engine.deleteCustomMacro(added.id);
    assert(engine.customMacros.length === initialLen, 'Should delete custom macro');
  });

  test('Macro Engine', 'Preserve time strings in params and support DONE, DELETE, and natural due dates', () => {
    const engine = new MacroEngine(null);

    // Test parameter parsing preserving 10:30 time
    const parsed = engine.parseScript('{ADD Meeting with Tom at 10:30 when:tomorrow priority:urgent}');
    assert(parsed.length === 1, 'Should parse 1 command');
    assert(parsed[0].params._clean === 'Meeting with Tom at 10:30', `Expected "Meeting with Tom at 10:30", got "${parsed[0].params._clean}"`);
    assert(parsed[0].params.when === 'tomorrow', 'Should parse when parameter');
    assert(parsed[0].params.priority === 'urgent', 'Should parse priority parameter');

    // Mock app for testing DONE, DELETE, and DELEGATE with "to Sarah"
    const testItem = new Item({ id: 'item_test_1', text: 'Task to be completed and deleted' });
    const mockApp = {
      items: [testItem],
      selectedItem: testItem,
      nlpEngine: new NLPEngine(),
      toggleDone(id) {
        const it = this.items.find(i => i.id === id);
        if (it) it.done = !it.done;
      },
      deleteItem(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.selectedItem = this.items[0] || null;
      },
      addItemWithRules(item) { this.items.unshift(item); },
      selectItem(id) { this.selectedItem = this.items.find(i => i.id === id); },
      saveAll() {},
      renderCurrentView() {}
    };

    const boundEngine = new MacroEngine(mockApp);

    // Test TOGGLE / DONE
    boundEngine.dispatchCommand({ command: 'DONE', args: '', params: {} });
    assert(testItem.done === true, 'DONE command should mark selected item done');

    // Test DELEGATE with "to Sarah due:Friday"
    const delRes = boundEngine.dispatchCommand({ command: 'DELEGATE', args: 'to Sarah due:Friday', params: engine.parseParams('to Sarah due:Friday') });
    assert(delRes.message.includes('Sarah'), 'Should delegate to Sarah without naming person "to"');
    assert(testItem.getCategory('DelegatedTo') === 'Sarah', 'DelegatedTo should be Sarah');

    // Test DELETE
    boundEngine.dispatchCommand({ command: 'DELETE', args: '', params: {} });
    assert(mockApp.items.length === 0, 'DELETE command should remove item');

    // Test prompt translation for mark done and delete
    const promptDone = engine.translatePromptToMacro('mark selected task as done');
    assert(promptDone.macroScript.includes('DONE'), 'Prompt "mark selected task as done" should translate to {DONE}');

    const promptDone2 = engine.translatePromptToMacro('mark done');
    assert(promptDone2.macroScript.includes('DONE'), 'Prompt "mark done" should translate to {DONE}');

    const promptComplete = engine.translatePromptToMacro('complete selected task');
    assert(promptComplete.macroScript.includes('DONE'), 'Prompt "complete selected task" should translate to {DONE}');

    const promptDelete = engine.translatePromptToMacro('delete selected task');
    assert(promptDelete.macroScript.includes('DELETE'), 'Prompt "delete selected task" should translate to {DELETE}');

    const promptDeleteThis = engine.translatePromptToMacro('delete this task');
    assert(promptDeleteThis.macroScript.includes('DELETE'), 'Prompt "delete this task" should translate to {DELETE}');
  });

  // --- 8. Template Service Tests ---
  test('Template Service', 'Retrieve workspace templates and verify President\'s Planner structure', () => {
    const service = new TemplateService();
    const workspaces = service.getWorkspaceTemplates();
    assert(workspaces.length >= 3, `Expected at least 3 workspace templates, got ${workspaces.length}`);

    const pp = service.getWorkspaceTemplateById('presidents_planner');
    assert(pp !== null, "President's Planner template must exist");
    assert(pp.views.some(v => v.name.includes('Dashboard')), 'PP should include Dashboard');
    assert(pp.views.some(v => v.name.includes('Ambiguous')), 'PP should include ? Ambiguous Statements view');
    assert(pp.views.some(v => v.name.includes('Delegated')), 'PP should include Delegated view');
    assert(pp.categories.some(c => c.name === 'DelegatedTo'), 'PP should include DelegatedTo category');
  });

  test('Template Service', 'Expand Item Templates with variables and default fallbacks', () => {
    const service = new TemplateService();

    // Meeting Note Template
    const meeting = service.instantiateItemTemplate('meeting_note', {
      title: 'Quarterly Architecture Sync',
      person: 'Tom',
      date: '2026-09-22',
      project: 'Death Star'
    });
    assert(meeting.text === 'Meeting: Quarterly Architecture Sync with Tom', 'Headline should substitute title and person');
    assert(meeting.note.includes('Agenda'), 'Body should include Agenda heading');
    assert(meeting.note.includes('Tom'), 'Body should include person');
    assert(meeting.getCategory('When') === '2026-09-22', 'When date should match');
    assert(meeting.getCategory('Project') === 'Death Star', 'Project should match');
    assert(meeting.getCategory('Type') === 'Meeting', 'Type should be Meeting');

    // Delegated Promise Template
    const promise = service.instantiateItemTemplate('delegated_promise', {
      title: 'Deliver Security Audit',
      person: 'Sarah',
      date: '2026-09-30',
      project: 'Finance & Compliance'
    });
    assert(promise.text === 'Follow-up: Sarah promised Deliver Security Audit', 'Headline should format promise');
    assert(promise.getCategory('Type') === 'Follow-up', 'Type should be Follow-up');
    assert(promise.getCategory('Status') === 'Delegated', 'Status should be Delegated');

    // Fallback variables
    const fallbackItem = service.instantiateItemTemplate('meeting_note', {});
    assert(fallbackItem.text.includes('Untitled Note'), 'Should fallback to default title');
    assert(Boolean(fallbackItem.getCategory('When')), 'Should fallback to current date');
  });

  test('Template Service', 'Support custom Item Templates creation and retrieval', () => {
    const service = new TemplateService();
    const initialCount = service.getItemTemplates().length;

    const custom = service.addCustomItemTemplate({
      name: 'Incident Postmortem',
      description: 'Template for outage postmortems and timeline reviews',
      headlinePattern: 'Postmortem: {{title}}',
      bodyPattern: '# 🚨 Incident Postmortem: {{title}}\n**Date:** {{date}}\n**Lead:** {{person}}\n\n## Impact\n- Service disruption metrics',
      variables: ['title', 'date', 'person']
    });

    assert(custom.id, 'Custom template should have generated ID');
    assert(service.getItemTemplates().length === initialCount + 1, 'Item templates array should increase');

    const instantiated = service.instantiateItemTemplate(custom.id, {
      title: 'Database Failover Outage',
      person: 'Tom',
      date: '2026-09-18'
    });

    assert(instantiated.text === 'Postmortem: Database Failover Outage', 'Headline should expand');
    assert(instantiated.note.includes('Tom'), 'Body should contain person');
  });

  // --- 9. Data Utilities Tests ---
  test('Data Utilities', 'Detect ambiguous items and rapid 1-click resolution', () => {
    const items = [
      new Item({ text: 'Complete item', categories: { When: '2026-09-20', Project: 'Website', Priority: 'High', Status: 'Pending' } }),
      new Item({ text: 'Undated item', categories: { Project: 'Website', Priority: 'Medium' } }),
      new Item({ text: 'No project item', categories: { When: '2026-09-20', Priority: 'Low' } }),
      new Item({ text: 'Unassigned Meeting', categories: { When: '2026-09-20', Project: 'Website', Type: 'Meeting' } }),
      new Item({ text: 'Finished item without date', done: true }) // Completed should not be flagged
    ];

    const ambiguous = DataUtilities.findAmbiguousItems(items);
    assert(ambiguous.length === 3, `Expected 3 ambiguous items, got ${ambiguous.length}`);

    // Resolve ambiguous item
    const target = ambiguous[0].item;
    DataUtilities.resolveAmbiguousItem(target, {
      when: '2026-09-25',
      project: 'Death Star',
      priority: 'Urgent'
    });
    assert(target.getCategory('When') === '2026-09-25', 'Resolved When should be set');
    assert(target.getCategory('Project') === 'Death Star', 'Resolved Project should be set');
    assert(target.getCategory('Priority') === 'Urgent', 'Resolved Priority should be set');
  });

  test('Data Utilities', 'Dismissing ambiguous item removes it from ambiguous triage', () => {
    const item = new Item({ text: 'Incomplete item missing date and project' });
    const items = [item];

    const initial = DataUtilities.findAmbiguousItems(items);
    assert(initial.length === 1, 'Should initially flag incomplete item');

    // Dismiss the item
    item.setCategory('Ambiguous', 'Dismissed');
    item.dismissedAmbiguous = true;

    const afterDismiss = DataUtilities.findAmbiguousItems(items);
    assert(afterDismiss.length === 0, 'Dismissed item must not be returned in ambiguous triage');
  });

  test('Data Utilities', 'Perpetual Tracking: roll overdue items to Today with note audit trail', () => {
    const today = new Date(2026, 8, 15); // Sept 15, 2026
    const items = [
      new Item({ text: 'Overdue task 1', categories: { When: '2026-09-10' }, note: 'Old note' }),
      new Item({ text: 'Overdue task 2', categories: { When: '2026-09-12' } }),
      new Item({ text: 'Today task', categories: { When: '2026-09-15' } }),
      new Item({ text: 'Future task', categories: { When: '2026-09-20' } }),
      new Item({ text: 'Completed overdue task', categories: { When: '2026-09-08' }, done: true })
    ];

    const result = DataUtilities.rolloverOverdueItems(items, '2026-09-15', today);
    assert(result.count === 2, `Expected 2 rolled items, got ${result.count}`);

    const item1 = items[0];
    assert(item1.getCategory('When') === '2026-09-15', 'Item 1 should be rolled to 2026-09-15');
    assert(item1.note.includes('[Rollover]'), 'Item 1 note should contain audit record');
    assert(item1.note.includes('2026-09-10'), 'Item 1 note should contain previous date');
  });

  test('Data Utilities', 'Delegated items tracking and delegation helper', () => {
    const item = new Item({ text: 'Deliver compliance memo' });
    DataUtilities.delegateItem(item, 'Sarah', '2026-09-28', 'Review draft on Wednesday');

    assert(item.getCategory('DelegatedTo') === 'Sarah', 'DelegatedTo should be Sarah');
    assert(item.getCategory('Status') === 'Delegated', 'Status should be Delegated');
    assert(item.getCategory('When') === '2026-09-28', 'When should match due date');
    assert(item.note.includes('Delegation Record'), 'Note should include delegation record');

    const delegatedList = DataUtilities.getDelegatedItems([item, new Item({ text: 'Non-delegated' })]);
    assert(delegatedList.length === 1 && delegatedList[0].text === 'Deliver compliance memo', 'Should find delegated item');
  });

  test('Data Utilities', 'Scratch Pad DWIM multi-dimensional classifier', () => {
    const nlp = new NLPEngine();
    const ref = new Date(2026, 8, 15, 12, 0, 0);

    // Call
    const callItem = DataUtilities.classifyScratchPadText('Call Sarah this Friday about contract', nlp, ref);
    assert(callItem.getCategory('Type') === 'Call', 'Should classify as Call');
    assert(callItem.getCategory('When') === '2026-09-18', 'Should parse date');
    assert(callItem.getCategory('People').includes('Sarah'), 'Should parse person Sarah');

    // Appointment / Meeting
    const meetItem = DataUtilities.classifyScratchPadText('Meet with Tom tomorrow at 3pm', nlp, ref);
    assert(meetItem.getCategory('Type') === 'Meeting', 'Should classify as Meeting');

    // Expense
    const expenseItem = DataUtilities.classifyScratchPadText('Lunch receipt with client $45.50', nlp, ref);
    assert(expenseItem.getCategory('Type') === 'Expense', 'Should classify as Expense');
    assert(expenseItem.cost === 45.5, `Expected cost 45.5, got ${expenseItem.cost}`);

    // Delegated follow-up
    const promiseItem = DataUtilities.classifyScratchPadText('Sarah promised delivery of report next week', nlp, ref);
    assert(promiseItem.getCategory('Type') === 'Follow-up', 'Should classify as Follow-up');
    assert(promiseItem.getCategory('Status') === 'Delegated', 'Should set Status: Delegated');
    assert(promiseItem.getCategory('DelegatedTo') === 'Sarah', 'Should set DelegatedTo: Sarah');
  });

  test('Data Utilities', 'Bulk assign, archive completed, and purge operations', () => {
    const items = [
      new Item({ text: 'Task 1', done: true }),
      new Item({ text: 'Task 2', done: false }),
      new Item({ text: 'Task 3', done: true })
    ];

    // Bulk assign
    const assignedCount = DataUtilities.bulkAssignCategory(items, 'Priority', 'High');
    assert(assignedCount === 3, 'Should assign 3 items');
    assert(items.every(i => i.getCategory('Priority') === 'High'), 'All items should have Priority: High');

    // Archive completed
    const archivedCount = DataUtilities.archiveCompletedItems(items);
    assert(archivedCount === 2, `Expected 2 archived items, got ${archivedCount}`);
    assert(items[0].getCategory('Status') === 'Archived', 'Item 0 should be Archived');
    assert(items[1].getCategory('Status') !== 'Archived', 'Item 1 should NOT be Archived');

    // Purge completed
    const remaining = DataUtilities.purgeCompletedItems(items);
    assert(remaining.length === 1 && remaining[0].text === 'Task 2', 'Only uncompleted items should remain');
  });

  // --- 13. Personal Sample Vault & Privacy Redaction Tests ---
  test('Personal Sample Vault', 'Parse and validate 70+ personal todo items with full categories', () => {
    const vault = getPersonalSampleVaultData();
    assert(vault.items.length >= 60, `Expected at least 60 items, got ${vault.items.length}`);
    assert(vault.categories.length >= 8, 'Should include all core categories');
    assert(vault.views.length >= 8, 'Should include all 8 AgendaVault views');

    // Verify all items have valid text, non-empty When, valid project
    vault.items.forEach((item, idx) => {
      assert(item.text && item.text.length > 0, `Item ${idx} should have non-empty text`);
      assert(item.text.length <= 200, `Item ${idx} headline should be <= 200 chars: "${item.text.slice(0, 40)}..."`);
      assert(item.getCategory('When'), `Item ${idx} should have When category`);
      assert(item.getCategory('Project'), `Item ${idx} should have Project category`);
      assert(item.getCategory('Status'), `Item ${idx} should have Status category`);
    });

    // Verify people categorization
    const withDenise = vault.items.filter(i => (i.getCategory('People') || []).includes('Denise'));
    assert(withDenise.length >= 1, 'Should find item with Denise');

    const withDrJames = vault.items.filter(i => (i.getCategory('People') || []).includes('Dr James'));
    assert(withDrJames.length >= 1, 'Should find item with Dr James');

    const withIlana = vault.items.filter(i => (i.getCategory('People') || []).includes('Ilana'));
    assert(withIlana.length >= 3, 'Should find items with Ilana');
  });

  test('Personal Sample Vault', 'CRITICAL PRIVACY RULE: Ensure sensitive numbers and identifiers are redacted', () => {
    const vault = getPersonalSampleVaultData();
    const forbiddenPatterns = [
      'XOJ804513136',
      '1952425035',
      'H3822-001-0',
      '1-800-583-8129',
      '800-583-8129',
      '877-583-8129',
      'H8634-016-0',
      '1376002057',
      '18006385656',
      'EL14145',
      'OBNEXU',
      'DVAZZ-29VPF',
      'TMB3884398'
    ];

    vault.items.forEach((item, idx) => {
      const combined = `${item.text} ${item.note}`;
      forbiddenPatterns.forEach(pattern => {
        assert(!combined.includes(pattern), `Item ${idx} contains sensitive unredacted pattern: ${pattern}`);
      });
    });

    // Confirm redaction placeholders exist
    const allNotes = vault.items.map(i => i.note).join('\n');
    assert(allNotes.includes('[REDACTED-PLAN-ID]'), 'Should contain redacted plan id placeholder');
    assert(allNotes.includes('[REDACTED-PHONE]'), 'Should contain redacted phone placeholder');
    assert(allNotes.includes('[REDACTED-ACH-ID]'), 'Should contain redacted ACH id placeholder');
    assert(allNotes.includes('[REDACTED-ORDER-ID]'), 'Should contain redacted order id placeholder');
    assert(allNotes.includes('[REDACTED-FLIGHT-CONF]'), 'Should contain redacted flight confirmation placeholder');
    assert(allNotes.includes('[REDACTED-LICENSE-KEY]'), 'Should contain redacted license key placeholder');
    assert(allNotes.includes('[REDACTED-SERIAL-NUM]'), 'Should contain redacted serial number placeholder');
  });

  test('Personal Sample Vault', 'STF & JSON Roundtrip serialization', () => {
    const vault = getPersonalSampleVaultData();

    // 1. STF Roundtrip
    const stf = STFService.exportToSTF(vault.items, vault.categories);
    assert(stf.includes('\\Categories\\'), 'STF should contain Categories section');
    assert(stf.includes('\\Items\\'), 'STF should contain Items section');
    assert(stf.includes('\\CatVal\\Project\\Health\\'), 'STF should contain CatVal for Health');

    const importedFromSTF = STFService.importFromSTF(stf);
    assert(importedFromSTF.items.length === vault.items.length, `Expected ${vault.items.length} STF imported items, got ${importedFromSTF.items.length}`);

    // 2. JSON Roundtrip
    const json = STFService.exportToJSON({
      items: vault.items,
      categories: vault.categories,
      rules: vault.rules,
      views: vault.views
    });
    const importedFromJSON = STFService.importFromJSON(json);
    assert(importedFromJSON.items.length === vault.items.length, 'JSON roundtrip item count should match');
  });

  test('Personal Sample Vault', 'StorageService 1-click vault switching & isolation', () => {
    const storage = new StorageService();

    // Switch to personal vault
    const personalData = storage.switchVault('personal');
    assert(storage.getActiveVault() === 'personal', 'Active vault should be personal');
    assert(personalData.items.length >= 60, 'Personal vault should have 60+ items');

    // Mutate personal vault
    personalData.items.push(new Item({ text: 'Temporary Personal Task' }));
    storage.saveData(personalData, 'personal');

    // Switch to demo vault
    const demoData = storage.switchVault('demo');
    assert(storage.getActiveVault() === 'demo', 'Active vault should be demo');
    assert(demoData.items.length > 0, 'Demo vault should have items');
    assert(demoData.items.some(i => i.text.includes('Sarah') || i.text.includes('Death Star')), 'Demo vault should contain original sample tasks');
    assert(!demoData.items.some(i => i.text === 'Temporary Personal Task'), 'Demo vault should not have personal items');

    // Reset personal vault to preset
    const resetData = storage.resetVaultToPreset('personal');
    assert(!resetData.items.some(i => i.text === 'Temporary Personal Task'), 'Reset personal vault should not have mutated item');
    assert(resetData.items.length >= 60, 'Reset personal vault should restore all items');
  });

  return results;
}
