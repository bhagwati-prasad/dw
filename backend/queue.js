const { loadQueue, saveQueue, appendHistory } = require('./storage');

function createQueueItem(item) {
  return {
    id: item.id || `queue-${Date.now()}`,
    title: item.title || 'Queued item',
    source: item.source || '',
    selectedResolution: item.selectedResolution || '1080p',
    selectedFormat: item.selectedFormat || 'mp4',
    status: 'queued',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attempts: 0
  };
}

function addQueueItem(item) {
  const queue = loadQueue();
  const queueItem = createQueueItem(item);
  queue.push(queueItem);
  saveQueue(queue);
  return queueItem;
}

function updateQueueItem(id, update) {
  const queue = loadQueue();
  const target = queue.find((entry) => entry.id === id);
  if (!target) {
    return null;
  }
  Object.assign(target, update, { updatedAt: new Date().toISOString() });
  saveQueue(queue);
  return target;
}

function listQueue() {
  return loadQueue();
}

function processQueue() {
  const queue = loadQueue();
  const current = queue.find((item) => item.status === 'queued');
  if (!current) {
    return null;
  }

  updateQueueItem(current.id, { status: 'downloading', progress: 25 });
  updateQueueItem(current.id, { status: 'downloading', progress: 75 });
  const completed = updateQueueItem(current.id, { status: 'completed', progress: 100 });
  appendHistory({
    id: `history-${Date.now()}`,
    source: current.source,
    title: current.title,
    selectedResolution: current.selectedResolution,
    selectedFormat: current.selectedFormat,
    status: 'completed',
    startedAt: current.createdAt,
    completedAt: new Date().toISOString(),
    outputPath: `/downloads/${current.title}.mp4`
  });
  return completed;
}

module.exports = {
  addQueueItem,
  updateQueueItem,
  listQueue,
  processQueue
};
