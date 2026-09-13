/**
 * test-suite.js - Comprehensive Unit & Integration Tests for AgendaVault.
 * Tests Lotus Agenda NLP, Filter expressions, Category Rules, STF format roundtrip,
 * nvALT search & creation, timezone safety, and completion date ranges.
 */

import { Item } from '../js/models/Item.js';
import { Category, CategoryValue } from '../js/models/Category.js';
import { Rule } from '../js/models/Rule.js';
import { View } from '../js/models/View.js';
import { NLPEngine } from '../js/services/nlpEngine.js';
import { FilterEngine } from '../js/services/filterEngine.js';
import { STFService } from '../js/services/stfService.js';
import { formatLocalDate, addDays, parseLocalDate } from '../js/utils/dateUtils.js';

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

  return results;
}
