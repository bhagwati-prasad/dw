const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'data');
const cacheDir = path.join(baseDir, 'cache');
const historyFile = path.join(baseDir, 'history', 'history.json');
const queueFile = path.join(baseDir, 'queue', 'queue.json');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureStorage() {
  ensureDir(cacheDir);
  ensureDir(path.dirname(historyFile));
  ensureDir(path.dirname(queueFile));
  if (!fs.existsSync(historyFile)) {
    fs.writeFileSync(historyFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(queueFile)) {
    fs.writeFileSync(queueFile, JSON.stringify([], null, 2));
  }
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getCachePath(key) {
  return path.join(cacheDir, `${key}.json`);
}

function getCachedEntry(key) {
  ensureStorage();
  const cachePath = getCachePath(key);
  return readJson(cachePath, null);
}

function saveCachedEntry(key, entry) {
  ensureStorage();
  const cachePath = getCachePath(key);
  writeJson(cachePath, entry);
  return cachePath;
}

function loadHistory() {
  ensureStorage();
  return readJson(historyFile, []);
}

function appendHistory(entry) {
  ensureStorage();
  const history = loadHistory();
  history.push(entry);
  writeJson(historyFile, history);
  return history;
}

function loadQueue() {
  ensureStorage();
  return readJson(queueFile, []);
}

function saveQueue(queue) {
  ensureStorage();
  writeJson(queueFile, queue);
  return queue;
}

module.exports = {
  ensureStorage,
  getCachedEntry,
  saveCachedEntry,
  loadHistory,
  appendHistory,
  loadQueue,
  saveQueue
};
