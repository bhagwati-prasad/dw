const test = require('node:test');
const assert = require('node:assert/strict');
const { loadHistory, appendHistory } = require('./storage');

test('history entries can be appended and loaded', () => {
  const entry = { id: 'history-test', status: 'completed', title: 'demo' };
  appendHistory(entry);
  const history = loadHistory();
  assert.ok(history.some((item) => item.id === entry.id));
});
