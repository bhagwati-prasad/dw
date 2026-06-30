const test = require('node:test');
const assert = require('node:assert/strict');
const { addQueueItem, listQueue, processQueue } = require('./queue');

test('queue accepts new items and lists them', () => {
  const item = addQueueItem({ title: 'demo', source: 'https://example.com/demo' });
  const queue = listQueue();
  assert.ok(queue.some((entry) => entry.id === item.id));
});

test('queue processing marks an item completed', () => {
  const item = addQueueItem({ title: 'process-me', source: 'https://example.com/process' });
  const processed = processQueue();
  assert.ok(processed && processed.status === 'completed');
});
