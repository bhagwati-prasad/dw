const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ensureStorage,
  getCachedEntry,
  saveCachedEntry,
  loadHistory,
  appendHistory,
  loadQueue,
  saveQueue
} = require('./storage');

test('storage creates directories and files on first use', () => {
  ensureStorage();
  const history = loadHistory();
  const queue = loadQueue();
  assert.ok(Array.isArray(history));
  assert.ok(Array.isArray(queue));
});

test('cache entry round-trips through disk', () => {
  const key = 'video-test-cache';
  const entry = { id: key, title: 'cached item' };
  saveCachedEntry(key, entry);
  assert.deepEqual(getCachedEntry(key), entry);
});

test('history and queue persist through disk', () => {
  const entry = { id: 'history-1', status: 'completed' };
  const queueItem = { id: 'queue-1', status: 'queued' };
  appendHistory(entry);
  saveQueue([queueItem]);
  assert.ok(loadHistory().some((item) => item.id === entry.id));
  assert.deepEqual(loadQueue(), [queueItem]);
});
