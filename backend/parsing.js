const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function normalizeSourceKey(source) {
  const normalized = String(source || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `video-${normalized || 'unknown'}`;
}

function buildPlaceholderItem(source, titlePrefix = 'Parsed video') {
  return {
    id: crypto.randomUUID(),
    source,
    title: `${titlePrefix}: ${source}`,
    duration: '00:03:20',
    timestamp: new Date().toISOString(),
    thumbnailUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
    previewUrl: '',
    resolutions: [
      { label: '1080p', format: 'mp4', selected: true },
      { label: '720p', format: 'mp4' },
      { label: '480p', format: 'mp4' }
    ],
    formatOptions: ['mp4', 'webm']
  };
}

function inferResolution(url) {
  const candidate = String(url || '').toLowerCase();
  const pMatches = Array.from(candidate.matchAll(/(\d{3,4})p/g)).map((match) => Number(match[1]));

  if (pMatches.length) {
    const bestValue = pMatches.reduce((highest, current) => (current > highest ? current : highest), 0);
    return { label: `${bestValue}p`, pixels: bestValue * 1000 };
  }

  const dimensionMatch = candidate.match(/(\d{3,4})x(\d{3,4})/);
  if (dimensionMatch) {
    const width = Number(dimensionMatch[1]);
    const height = Number(dimensionMatch[2]);
    const inferred = Math.min(width, height);
    return { label: `${inferred}p`, pixels: width * height };
  }

  return { label: 'unknown', pixels: 0 };
}

function collectMediaCandidates(html, source) {
  const text = String(html || '');
  const candidates = new Set();

  const addCandidate = (value) => {
    const candidate = String(value || '').trim();
    if (!candidate || candidate.startsWith('javascript:')) {
      return;
    }

    if (/^https?:\/\//i.test(candidate) || candidate.startsWith('/')) {
      candidates.add(candidate);
    }
  };

  for (const match of text.matchAll(/(?:src|href|data-src|data-href)=['"]([^'"]+)['"]/gi)) {
    addCandidate(match[1]);
  }

  for (const match of text.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    addCandidate(match[0]);
  }

  if (source) {
    addCandidate(source);
  }

  return Array.from(candidates).filter((url) => /\.(m3u8|mp4|webm|m3u)(\?.*)?$/i.test(url) || /video|media|playlist|master/i.test(url));
}

function createXhamAdapter(source, options = {}) {
  const html = options.html || '';
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 'Unknown title').trim();
  const thumbnailUrl = (
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<link[^>]+rel=["']preload["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] ||
    ''
  ).trim();
  const mediaCandidates = collectMediaCandidates(html, source);
  const resolutions = mediaCandidates
    .map((url) => ({ url, ...inferResolution(url) }))
    .filter((entry) => entry.label !== 'unknown')
    .sort((a, b) => b.pixels - a.pixels);

  const deduped = [];
  const seenLabels = new Set();
  for (const entry of resolutions) {
    if (!seenLabels.has(entry.label)) {
      seenLabels.add(entry.label);
      deduped.push(entry);
    }
  }

  const bestResolution = deduped[0] || null;
  const item = buildPlaceholderItem(source, title || 'Parsed video');
  item.title = title || item.title;
  item.thumbnailUrl = thumbnailUrl || options.thumbnailUrl || item.thumbnailUrl;
  item.resolutions = [
    ...(bestResolution ? [{ label: bestResolution.label, format: 'mp4', selected: true, url: bestResolution.url }] : []),
    ...deduped.slice(1).map((entry) => ({ label: entry.label, format: 'mp4', url: entry.url }))
  ];

  if (!item.resolutions.length) {
    item.resolutions = buildPlaceholderItem(source, title || 'Parsed video').resolutions;
  }

  return {
    kind: 'single',
    source,
    title: item.title,
    duration: item.duration,
    thumbnailUrl: item.thumbnailUrl,
    previewUrl: item.previewUrl,
    resolutions: item.resolutions,
    formatOptions: item.formatOptions,
    item
  };
}

function getAdapter(source, html = '') {
  if (String(source || '').includes('xh') || /xhamster|xhpingcdn/i.test(html)) {
    return createXhamAdapter;
  }

  return null;
}

function analyzeSource(source, options = {}) {
  const html = options.html || '';
  const adapter = getAdapter(source, html);
  if (!html || !adapter) {
    return parseSingleUrl(source);
  }

  return adapter(source, options);
}

function parseSingleUrl(source) {
  const item = buildPlaceholderItem(source, 'Parsed video');

  return {
    kind: 'single',
    source,
    title: item.title,
    duration: item.duration,
    thumbnailUrl: item.thumbnailUrl,
    previewUrl: item.previewUrl,
    resolutions: item.resolutions,
    formatOptions: item.formatOptions,
    item
  };
}

function parseCreatorInput(input) {
  const creatorName = String(input || '').trim() || 'demo creator';
  const items = Array.from({ length: 3 }, (_, index) => buildPlaceholderItem(`${creatorName}-video-${index + 1}`, `Creator item ${index + 1}`));

  return {
    kind: 'creator',
    creatorName,
    items
  };
}

function parseBatchInput(input) {
  const items = String(input || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((source) => buildPlaceholderItem(source, 'Batch item'));

  return {
    kind: 'batch',
    items
  };
}

module.exports = {
  normalizeSourceKey,
  parseSingleUrl,
  parseCreatorInput,
  parseBatchInput,
  analyzeSource,
  createXhamAdapter,
  inferResolution,
  collectMediaCandidates
};
