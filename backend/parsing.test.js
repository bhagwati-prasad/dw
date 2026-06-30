const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSourceKey, parseSingleUrl, parseCreatorInput, parseBatchInput, analyzeSource } = require('./parsing');

test('normalizeSourceKey creates a stable cache key', () => {
  const key1 = normalizeSourceKey('https://www.example.com/video?id=1');
  const key2 = normalizeSourceKey('https://www.example.com/video?id=1');
  assert.equal(key1, key2);
  assert.match(key1, /^video-/);
});

test('parseSingleUrl returns metadata with default resolutions', () => {
  const parsed = parseSingleUrl('https://www.example.com/video?id=123');
  assert.equal(parsed.kind, 'single');
  assert.ok(parsed.title);
  assert.ok(Array.isArray(parsed.resolutions));
  assert.ok(parsed.resolutions.some((item) => item.label === '1080p'));
});

test('parseCreatorInput returns a list of items', () => {
  const parsed = parseCreatorInput('demo creator');
  assert.equal(parsed.kind, 'creator');
  assert.ok(Array.isArray(parsed.items));
  assert.ok(parsed.items.length > 0);
});

test('parseBatchInput splits input into individual items', () => {
  const parsed = parseBatchInput('https://a.com/v1\nhttps://b.com/v2');
  assert.equal(parsed.kind, 'batch');
  assert.equal(parsed.items.length, 2);
});

test('analyzeSource can parse the sample HTML and detect the best resolution', () => {
  const sampleHtmlPath = path.join(__dirname, '..', 'sample.html');
  const sampleUrlPath = path.join(__dirname, '..', 'sample.url');
  const html = require('fs').readFileSync(sampleHtmlPath, 'utf8');
  const source = require('fs').readFileSync(sampleUrlPath, 'utf8').trim();

  const parsed = analyzeSource(source, { html });

  assert.equal(parsed.kind, 'single');
  assert.ok(parsed.item.title);
  assert.ok(parsed.item.thumbnailUrl && /^https?:\/\//i.test(parsed.item.thumbnailUrl));
  assert.ok(parsed.item.resolutions.length > 0);
  assert.ok(parsed.item.resolutions.some((item) => item.label === '2160p'));
  assert.equal(parsed.item.resolutions[0].label, '2160p');
});
