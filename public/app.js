const themeToggle = document.getElementById('theme-toggle');
const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
const views = {
  input: document.getElementById('view-input'),
  queue: document.getElementById('view-queue'),
  history: document.getElementById('view-history')
};
const healthStatus = document.getElementById('health-status');
const form = document.getElementById('input-form');
const sourceInput = document.getElementById('source-input');
const clearBtn = document.getElementById('clear-btn');
const resultsPanel = document.createElement('div');
resultsPanel.className = 'panel';
resultsPanel.innerHTML = '<h3>Analysis results</h3><div id="results-body" class="empty-state">No results yet.</div>';
const content = document.querySelector('.content');
content.insertBefore(resultsPanel, content.children[1]);

let queuePollTimer = null;

function startQueuePolling() {
  if (queuePollTimer) {
    clearInterval(queuePollTimer);
  }
  queuePollTimer = setInterval(() => {
    refreshQueueView();
  }, 1500);
}

async function refreshQueueView() {
  const queuePanel = document.getElementById('queue-list');
  if (!queuePanel) {
    return;
  }

  try {
    const response = await fetch('/api/queue');
    const queue = await response.json();
    if (!queue.length) {
      queuePanel.innerHTML = '<div class="empty-state">No queued items yet.</div>';
      return;
    }

    queuePanel.innerHTML = queue.map((item) => `
      <div class="queue-item">
        <div>
          <strong>${item.title}</strong>
          <p>${item.source}</p>
        </div>
        <div class="queue-meta">
          <div class="queue-progress"><span style="width:${item.progress || 0}%"></span></div>
          <span class="queue-pill">${item.status}</span>
        </div>
      </div>
    `).join('');
  } catch (error) {
    queuePanel.innerHTML = '<div class="empty-state">Unable to load queue.</div>';
  }
}

function renderResults(data) {
  const resultsBody = document.getElementById('results-body');

  if (data.kind === 'single') {
    const item = data.item;
    resultsBody.innerHTML = `
      <article class="result-card rich">
        <div class="preview-area">
          <img src="${item.thumbnailUrl}" alt="${item.title}" onerror="this.style.display='none'; this.parentElement.classList.add('preview-fallback');" />
          <div class="preview-badge">Source preview</div>
        </div>
        <div class="result-details">
          <div class="result-heading">
            <h4>${item.title}</h4>
            <span class="queue-pill">${item.resolutions[0]?.label || 'Ready'}</span>
          </div>
          <p><strong>Source:</strong> ${item.source}</p>
          <p><strong>Duration:</strong> ${item.duration}</p>
          <p><strong>Parsed from:</strong> ${data.source}</p>
          <label class="field-label" for="resolution-select">Resolution</label>
          <select id="resolution-select" class="control-select">
            ${item.resolutions.map((resolution) => `<option value="${resolution.label}" ${resolution.selected ? 'selected' : ''}>${resolution.label}</option>`).join('')}
          </select>
          <label class="field-label" for="format-select">Format</label>
          <select id="format-select" class="control-select">
            ${item.formatOptions.map((format) => `<option value="${format}" ${format === 'mp4' ? 'selected' : ''}>${format.toUpperCase()}</option>`).join('')}
          </select>
          <div class="actions compact-actions">
            <button class="primary-btn" type="button">Queue download</button>
          </div>
        </div>
      </article>
    `;
    return;
  }

  const itemsMarkup = data.items.map((item) => `
    <article class="result-card rich">
      <div class="preview-area">
        <img src="${item.thumbnailUrl}" alt="${item.title}" />
        <div class="preview-badge">Preview ready</div>
      </div>
      <div class="result-details">
        <h4>${item.title}</h4>
        <p><strong>Source:</strong> ${item.source}</p>
        <p><strong>Duration:</strong> ${item.duration}</p>
        <label class="field-label" for="resolution-${item.id}">Resolution</label>
        <select id="resolution-${item.id}" class="control-select">
          ${item.resolutions.map((resolution) => `<option value="${resolution.label}" ${resolution.selected ? 'selected' : ''}>${resolution.label}</option>`).join('')}
        </select>
        <label class="field-label" for="format-${item.id}">Format</label>
        <select id="format-${item.id}" class="control-select">
          ${item.formatOptions.map((format) => `<option value="${format}" ${format === 'mp4' ? 'selected' : ''}>${format.toUpperCase()}</option>`).join('')}
        </select>
        <div class="actions compact-actions">
          <button class="ghost-btn" type="button">Add to queue</button>
        </div>
      </div>
    </article>
  `).join('');

  resultsBody.innerHTML = itemsMarkup;
}

async function queueSelectedItem(item) {
  try {
    const response = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(item)
    });
    const queuedItem = await response.json();
    healthStatus.textContent = `Queued ${queuedItem.title}`;
    await refreshQueueView();
  } catch (error) {
    healthStatus.textContent = 'Unable to queue item.';
  }
}

async function refreshHistoryView() {
  const historyList = document.getElementById('history-list');
  const filter = document.getElementById('history-filter')?.value || 'all';
  if (!historyList) {
    return;
  }

  try {
    const response = await fetch('/api/history');
    const history = await response.json();
    const filtered = history.filter((entry) => filter === 'all' || entry.status === filter);
    const sorted = filtered.sort((a, b) => new Date(b.completedAt || b.startedAt || 0) - new Date(a.completedAt || a.startedAt || 0));

    if (!sorted.length) {
      historyList.innerHTML = '<div class="empty-state">No history yet.</div>';
      return;
    }

    historyList.innerHTML = sorted.map((entry) => `
      <div class="history-item">
        <div>
          <strong>${entry.title}</strong>
          <p>${entry.source}</p>
        </div>
        <div class="history-meta">
          <span class="queue-pill">${entry.status}</span>
          <span class="history-date">${new Date(entry.completedAt || entry.startedAt).toLocaleString()}</span>
        </div>
      </div>
    `).join('');
  } catch (error) {
    historyList.innerHTML = '<div class="empty-state">Unable to load history.</div>';
  }
}

function setActiveView(viewName) {
  navButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  Object.entries(views).forEach(([name, view]) => {
    view.classList.toggle('active', name === viewName);
  });
}

async function loadHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    healthStatus.textContent = `Backend ready: ${data.status}`;
  } catch (error) {
    healthStatus.textContent = 'Backend unavailable';
  }
}

function toggleTheme() {
  const isDark = document.body.dataset.theme !== 'light';
  document.body.dataset.theme = isDark ? 'light' : 'dark';
  themeToggle.textContent = isDark ? '☀️ Light' : '🌙 Dark';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = sourceInput.value.trim();
  if (!value) {
    healthStatus.textContent = 'Enter a source to begin.';
    return;
  }

  const mode = value.includes('\n') ? 'batch' : 'single';
  const resultsBody = document.getElementById('results-body');
  resultsBody.innerHTML = '<div class="empty-state">Analyzing source…</div>';
  healthStatus.textContent = `Preparing ${mode === 'batch' ? 'batch' : 'single'} request...`;

  try {
    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: value, mode })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to parse source');
    }

    renderResults(data);

    if (data.kind === 'single') {
      const queueButton = document.querySelector('.primary-btn');
      queueButton?.addEventListener('click', () => queueSelectedItem({
        title: data.item.title,
        source: data.source,
        selectedResolution: data.item.resolutions.find((resolution) => resolution.selected)?.label || '1080p',
        selectedFormat: 'mp4'
      }));
    }

    healthStatus.textContent = 'Analysis complete.';
  } catch (error) {
    resultsBody.innerHTML = `<div class="empty-state">${error.message}</div>`;
    healthStatus.textContent = 'Analysis failed.';
  }
});

clearBtn.addEventListener('click', () => {
  sourceInput.value = '';
  healthStatus.textContent = 'Input cleared.';
});

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    setActiveView(btn.dataset.view);
    if (btn.dataset.view === 'history') {
      refreshHistoryView();
    }
  });
});

document.getElementById('history-filter')?.addEventListener('change', refreshHistoryView);
document.getElementById('refresh-history-btn')?.addEventListener('click', refreshHistoryView);

themeToggle.addEventListener('click', toggleTheme);

setActiveView('input');
loadHealth();
refreshQueueView();
refreshHistoryView();
startQueuePolling();

const processQueueBtn = document.getElementById('process-queue-btn');
processQueueBtn?.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/queue/next');
    const result = await response.json();
    healthStatus.textContent = result.status === 'completed' ? 'Queue item completed.' : 'Queue is empty.';
    await refreshQueueView();
  } catch (error) {
    healthStatus.textContent = 'Unable to process queue.';
  }
});
