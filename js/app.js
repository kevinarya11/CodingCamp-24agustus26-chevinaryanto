/* =========================================
   LIFE DASHBOARD — app.js
   Vanilla JS · localStorage · No dependencies
   ========================================= */

'use strict';

/* -----------------------------------------
   STATE
----------------------------------------- */
let tasks = [];
let activeFilter = 'all';
let searchQuery  = '';
let sortMode     = 'created';
let pendingDeleteId = null;

/* -----------------------------------------
   STORAGE
----------------------------------------- */
const STORAGE_KEY = 'lifedashboard_tasks_v1';

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  } catch {
    tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/* -----------------------------------------
   HELPERS
----------------------------------------- */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDueDate(dateStr) {
  if (!dateStr) return null;
  const today = todayStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  if (dateStr === today)    return { label: 'Due today',    cls: 'due-today' };
  if (dateStr === tomorrowStr) return { label: 'Due tomorrow', cls: '' };
  if (dateStr < today)      return { label: `Overdue · ${formatDateFriendly(dateStr)}`, cls: 'overdue' };

  return { label: `Due ${formatDateFriendly(dateStr)}`, cls: '' };
}

function formatDateFriendly(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getCategoryLabel(cat) {
  const map = {
    work: '💼 Work', personal: '🏠 Personal',
    health: '💪 Health', learning: '📚 Learning', finance: '💰 Finance'
  };
  return map[cat] || cat;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* -----------------------------------------
   CLOCK
   — date string only updates when the day
     changes, not every second
----------------------------------------- */
let _lastDateStr = '';

function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('clock').textContent = `${hh}:${mm}:${ss}`;

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  if (dateStr !== _lastDateStr) {
    _lastDateStr = dateStr;
    document.getElementById('date-display').textContent = dateStr;
  }
}

/* -----------------------------------------
   COUNTS & STATS
----------------------------------------- */
function computeCounts() {
  const today = todayStr();
  const counts = {
    all: tasks.length,
    today: tasks.filter(t => t.due === today && !t.completed).length,
    upcoming: tasks.filter(t => t.due > today && !t.completed).length,
    completed: tasks.filter(t => t.completed).length,
    work: tasks.filter(t => t.category === 'work').length,
    personal: tasks.filter(t => t.category === 'personal').length,
    health: tasks.filter(t => t.category === 'health').length,
    learning: tasks.filter(t => t.category === 'learning').length,
    finance: tasks.filter(t => t.category === 'finance').length,
  };

  const overdue = tasks.filter(t => !t.completed && t.due && t.due < today).length;
  const pending = tasks.filter(t => !t.completed).length;
  const done    = tasks.filter(t => t.completed).length;

  return { counts, overdue, pending, done };
}

function updateSidebar() {
  const { counts, overdue, pending, done } = computeCounts();

  // nav counts
  ['all', 'today', 'upcoming', 'completed',
   'work', 'personal', 'health', 'learning', 'finance'].forEach(key => {
    const el = document.getElementById(`count-${key}`);
    if (el) el.textContent = counts[key] ?? 0;
  });

  // stat cards
  document.getElementById('stat-total').textContent   = tasks.length;
  document.getElementById('stat-done').textContent    = done;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-overdue').textContent = overdue;

  // progress ring (circumference = 2π×32 ≈ 201)
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const circumference = 201;
  const offset = circumference - (circumference * pct) / 100;
  document.getElementById('ring-fill').style.strokeDashoffset = offset;
  document.getElementById('progress-pct').textContent = `${pct}%`;
  document.getElementById('progress-caption').textContent =
    tasks.length === 0 ? 'No tasks yet'
    : pct === 100      ? 'All done! 🎉'
    : `${done} of ${tasks.length} tasks done`;
}

/* -----------------------------------------
   FILTER & SORT
   — todayStr() called once per getFilteredTasks()
     invocation, not repeatedly inside each filter
----------------------------------------- */
function getFilteredTasks() {
  const today = todayStr();  // computed once, reused below
  let filtered = [...tasks];

  // filter by tab
  switch (activeFilter) {
    case 'today':     filtered = filtered.filter(t => t.due === today && !t.completed); break;
    case 'upcoming':  filtered = filtered.filter(t => t.due > today && !t.completed);   break;
    case 'completed': filtered = filtered.filter(t => t.completed);  break;
    case 'all':       break;
    default:          filtered = filtered.filter(t => t.category === activeFilter); break;
  }

  // search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );
  }

  // sort
  const priorityRank = { high: 0, medium: 1, low: 2 };
  filtered.sort((a, b) => {
    switch (sortMode) {
      case 'due':
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due.localeCompare(b.due);
      case 'priority':
        return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
      case 'alpha':
        return a.title.localeCompare(b.title);
      default: // created
        return b.createdAt - a.createdAt;
    }
  });

  return filtered;
}

/* -----------------------------------------
   RENDER TASKS
----------------------------------------- */
function getFilterTitle() {
  const map = {
    all: 'All Tasks', today: 'Today', upcoming: 'Upcoming',
    completed: 'Completed',
    work: '💼 Work', personal: '🏠 Personal', health: '💪 Health',
    learning: '📚 Learning', finance: '💰 Finance'
  };
  return map[activeFilter] || activeFilter;
}

function renderTasks() {
  const list      = document.getElementById('task-list');
  const emptyEl   = document.getElementById('empty-state');
  const titleEl   = document.getElementById('list-title');
  const filtered  = getFilteredTasks();

  titleEl.textContent = getFilterTitle();

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyEl.classList.add('visible');
    return;
  }

  emptyEl.classList.remove('visible');
  list.innerHTML = filtered.map(t => buildTaskHTML(t)).join('');
}

function buildTaskHTML(task) {
  const due  = formatDueDate(task.due);
  const dueHTML = due
    ? `<span class="task-due ${due.cls}">📅 ${escapeHtml(due.label)}</span>`
    : '';

  const checkMark = task.completed ? '✓' : '';

  // No inline onclick — data-action attributes are handled by event delegation
  return `
    <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}" data-priority="${task.priority}">
      <button
        class="task-checkbox"
        data-action="toggle"
        aria-label="${task.completed ? 'Mark incomplete' : 'Mark complete'}"
      >${checkMark}</button>

      <div class="task-body">
        <div class="task-title-row">
          <span class="task-title">${escapeHtml(task.title)}</span>
          <span class="priority-badge ${task.priority}">${task.priority}</span>
          <span class="cat-badge ${task.category}">${getCategoryLabel(task.category)}</span>
        </div>
        ${task.notes ? `<p class="task-notes">${escapeHtml(task.notes)}</p>` : ''}
        <div class="task-meta">
          ${dueHTML}
        </div>
      </div>

      <div class="task-actions">
        <button class="task-btn" data-action="edit" aria-label="Edit task">✎</button>
        <button class="task-btn delete" data-action="delete" aria-label="Delete task">🗑</button>
      </div>
    </li>
  `;
}

/* -----------------------------------------
   TOGGLE COMPLETE
----------------------------------------- */
function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  updateSidebar();
  renderTasks();
}

/* -----------------------------------------
   MODAL — ADD / EDIT
----------------------------------------- */
const modalOverlay = document.getElementById('modal-overlay');
const taskForm     = document.getElementById('task-form');
const modalTitle   = document.getElementById('modal-title');

function openAddModal() {
  document.getElementById('edit-id').value    = '';
  document.getElementById('task-title').value = '';
  document.getElementById('task-notes').value = '';
  document.getElementById('task-category').value = 'work';
  document.getElementById('task-priority').value  = 'medium';
  document.getElementById('task-due').value   = '';
  document.getElementById('title-error').textContent = '';
  modalTitle.textContent = 'New Task';
  document.getElementById('save-btn').textContent = 'Save Task';
  modalOverlay.setAttribute('aria-hidden', 'false');
  modalOverlay.classList.add('open');
  document.getElementById('task-title').focus();
}

function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  document.getElementById('edit-id').value        = task.id;
  document.getElementById('task-title').value     = task.title;
  document.getElementById('task-notes').value     = task.notes || '';
  document.getElementById('task-category').value  = task.category;
  document.getElementById('task-priority').value  = task.priority;
  document.getElementById('task-due').value       = task.due || '';
  document.getElementById('title-error').textContent = '';
  modalTitle.textContent = 'Edit Task';
  document.getElementById('save-btn').textContent = 'Update Task';
  modalOverlay.setAttribute('aria-hidden', 'false');
  modalOverlay.classList.add('open');
  document.getElementById('task-title').focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
  modalOverlay.setAttribute('aria-hidden', 'true');
}

/* -----------------------------------------
   MODAL — DELETE
----------------------------------------- */
const deleteOverlay = document.getElementById('delete-overlay');

function openDeleteModal(id) {
  pendingDeleteId = id;
  deleteOverlay.setAttribute('aria-hidden', 'false');
  deleteOverlay.classList.add('open');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  deleteOverlay.classList.remove('open');
  deleteOverlay.setAttribute('aria-hidden', 'true');
}

function confirmDelete() {
  if (!pendingDeleteId) return;
  tasks = tasks.filter(t => t.id !== pendingDeleteId);
  saveTasks();
  closeDeleteModal();
  updateSidebar();
  renderTasks();
}

/* -----------------------------------------
   FORM SUBMIT
----------------------------------------- */
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('task-title').value.trim();
  if (!title) {
    document.getElementById('title-error').textContent = 'Title is required.';
    document.getElementById('task-title').focus();
    return;
  }
  document.getElementById('title-error').textContent = '';

  const editId   = document.getElementById('edit-id').value;
  const notes    = document.getElementById('task-notes').value.trim();
  const category = document.getElementById('task-category').value;
  const priority = document.getElementById('task-priority').value;
  const due      = document.getElementById('task-due').value;

  if (editId) {
    // update existing
    const task = tasks.find(t => t.id === editId);
    if (task) {
      task.title    = title;
      task.notes    = notes;
      task.category = category;
      task.priority = priority;
      task.due      = due;
    }
  } else {
    // create new
    tasks.push({
      id:        generateId(),
      title,
      notes,
      category,
      priority,
      due,
      completed: false,
      createdAt: Date.now()
    });
  }

  saveTasks();
  closeModal();
  updateSidebar();
  renderTasks();
});

/* -----------------------------------------
   NAV FILTER BUTTONS
----------------------------------------- */
function setFilter(filter) {
  activeFilter = filter;

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  renderTasks();
}

/* -----------------------------------------
   KEYBOARD & OVERLAY CLOSE
----------------------------------------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeDeleteModal();
    // closeLinkModal defined later — guard for init order
    if (typeof closeLinkModal === 'function') closeLinkModal();
  }
});

// close modals when clicking the backdrop
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

deleteOverlay.addEventListener('click', (e) => {
  if (e.target === deleteOverlay) closeDeleteModal();
});

/* -----------------------------------------
   WIRE UP STATIC BUTTONS
----------------------------------------- */
document.getElementById('open-modal-btn').addEventListener('click', openAddModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('cancel-btn').addEventListener('click', closeModal);
document.getElementById('delete-confirm').addEventListener('click', confirmDelete);
document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
document.getElementById('delete-cancel-x').addEventListener('click', closeDeleteModal);

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

document.getElementById('search-input').addEventListener('input', (function () {
  // Debounce: wait 180 ms after the user stops typing before re-rendering.
  // Keeps the UI responsive with no perceptible lag on large lists.
  var timer;
  return function (e) {
    clearTimeout(timer);
    timer = setTimeout(function () {
      searchQuery = e.target.value.trim();
      renderTasks();
    }, 180);
  };
})());

document.getElementById('sort-select').addEventListener('change', (e) => {
  sortMode = e.target.value;
  renderTasks();
});

/* -----------------------------------------
   EVENT DELEGATION — task list buttons
   Replaces inline onclick handlers so the app
   works under MV3 extension CSP (no inline JS)
----------------------------------------- */
document.getElementById('task-list').addEventListener('click', function (e) {
  var btn = e.target.closest('button[data-action]');
  if (!btn) return;
  var li  = btn.closest('[data-id]');
  if (!li) return;
  var id  = li.dataset.id;
  var action = btn.dataset.action;
  if (action === 'toggle') toggleComplete(id);
  if (action === 'edit')   openEditModal(id);
  if (action === 'delete') openDeleteModal(id);
});

/* =========================================
   CHALLENGE 1 — LIGHT / DARK MODE
   Persisted in localStorage as 'theme': 'light' | 'dark'
   Applied as class on <html> so CSS variables do all the work.
   ========================================= */
const THEME_KEY  = 'lifedashboard_theme_v1';
const themeToggleBtn  = document.getElementById('theme-toggle');
const themeIconEl     = document.getElementById('theme-icon');

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light');
    themeIconEl.textContent = '☀️';
    themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
    themeToggleBtn.title = 'Switch to dark mode';
  } else {
    document.documentElement.classList.remove('light');
    themeIconEl.textContent = '🌙';
    themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
    themeToggleBtn.title = 'Switch to light mode';
  }
}

function loadTheme() {
  // Default to dark; respect saved preference
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

themeToggleBtn.addEventListener('click', function () {
  const isLight = document.documentElement.classList.contains('light');
  const next    = isLight ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

/* =========================================
   CHALLENGE 2 — CUSTOM NAME IN GREETING
   Persisted in localStorage as 'lifedashboard_name_v1'
   The name is woven into the greeting message on update.
   ========================================= */
const NAME_KEY     = 'lifedashboard_name_v1';
const nameInputEl  = document.getElementById('greeting-name');

function loadName() {
  const saved = localStorage.getItem(NAME_KEY) || '';
  nameInputEl.value = saved;
}

function updateGreetingName() {
  localStorage.setItem(NAME_KEY, nameInputEl.value.trim());
  updateGreeting(); // re-render greeting with new name
}

// Save on every keystroke (debounced 400 ms so we don't spam localStorage)
nameInputEl.addEventListener('input', (function () {
  var t;
  return function () {
    clearTimeout(t);
    t = setTimeout(updateGreetingName, 400);
  };
})());

/* =========================================
   GREETING
   ========================================= */
const GREETINGS = [
  { range: [5,  12], emoji: '🌅', msg: 'Good morning',   sub: 'Start your day strong.' },
  { range: [12, 17], emoji: '☀️',  msg: 'Good afternoon', sub: 'Keep the momentum going.' },
  { range: [17, 21], emoji: '🌇', msg: 'Good evening',   sub: 'Wind down and reflect.' },
  { range: [21, 24], emoji: '🌙', msg: 'Good night',     sub: 'Rest well — you earned it.' },
  { range: [0,   5], emoji: '🌙', msg: 'Burning midnight oil?', sub: "Don't forget to rest." },
];

function updateGreeting() {
  const h    = new Date().getHours();
  const slot = GREETINGS.find(g => h >= g.range[0] && h < g.range[1]) || GREETINGS[0];
  const name = (localStorage.getItem(NAME_KEY) || '').trim();

  document.getElementById('greeting-emoji').textContent = slot.emoji;
  // Append name if set: "Good morning, Alex!" vs "Good morning!"
  document.getElementById('greeting-msg').textContent =
    name ? `${slot.msg}, ${name}!` : `${slot.msg}!`;
  document.getElementById('greeting-sub').textContent = slot.sub;
}

/* =========================================
   CHALLENGE 3 — FOCUS TIMER (configurable duration)
   Duration persisted in localStorage as 'lifedashboard_timer_duration_v1'
   Preset pills + a free-text number input both update the same value.
   ========================================= */
const TIMER_DURATION_KEY = 'lifedashboard_timer_duration_v1';
const DEFAULT_MINUTES    = 25;

// Load saved duration (in minutes), fallback to 25
let timerMinutes  = parseInt(localStorage.getItem(TIMER_DURATION_KEY), 10) || DEFAULT_MINUTES;
let timerDuration = timerMinutes * 60;  // seconds — source of truth for the countdown
let timerSeconds  = timerDuration;
let timerInterval = null;
let timerRunning  = false;

const timerDisplay  = document.getElementById('timer-display');
const timerProgress = document.getElementById('timer-progress-bar');
const timerBadge    = document.getElementById('timer-status-badge');
const btnStart      = document.getElementById('timer-start');
const btnStop       = document.getElementById('timer-stop');
const btnReset      = document.getElementById('timer-reset');
const durationInput = document.getElementById('timer-duration');
const durationRow   = document.getElementById('timer-duration-pills').parentElement;

function formatTimer(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTimer(timerSeconds);

  // progress bar shrinks as time passes
  const pct = (timerSeconds / timerDuration) * 100;
  timerProgress.style.width = pct + '%';

  // urgent (≤ 5 min) only while running
  const urgent = timerSeconds <= 300 && timerRunning;
  timerDisplay.classList.toggle('urgent', urgent);
  timerProgress.classList.toggle('urgent', urgent);
}

function setTimerBadge(state) {
  const labels = { ready: 'Ready', running: 'Running', paused: 'Paused', done: 'Done! 🎉' };
  timerBadge.textContent = labels[state] || state;
  timerBadge.className   = 'timer-status-badge ' + (state === 'ready' ? '' : state);
}

function lockDurationPicker(locked) {
  // Prevent changing duration mid-session
  durationRow.classList.toggle('locked', locked);
}

function applyDuration(minutes) {
  // Clamp to 1–120
  minutes       = Math.max(1, Math.min(120, parseInt(minutes, 10) || DEFAULT_MINUTES));
  timerMinutes  = minutes;
  timerDuration = minutes * 60;
  timerSeconds  = timerDuration;
  localStorage.setItem(TIMER_DURATION_KEY, String(minutes));

  // Sync input field value
  durationInput.value = minutes;

  // Sync active pill (only marks a pill if it matches a preset)
  document.querySelectorAll('.duration-pill').forEach(function (pill) {
    pill.classList.toggle('active', parseInt(pill.dataset.minutes, 10) === minutes);
  });

  setTimerBadge('ready');
  btnStart.disabled = false;
  btnStop.disabled  = true;
  renderTimer();
}

function startTimer() {
  if (timerRunning || timerSeconds === 0) return;
  timerRunning = true;
  lockDurationPicker(true);
  setTimerBadge('running');
  btnStart.disabled = true;
  btnStop.disabled  = false;

  timerInterval = setInterval(function () {
    timerSeconds--;
    renderTimer();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerSeconds = 0;
      lockDurationPicker(false);
      setTimerBadge('done');
      btnStart.disabled = true;
      btnStop.disabled  = true;
      if (Notification && Notification.permission === 'granted') {
        new Notification('⏱ Focus session complete!', {
          body: 'Great work — take a short break.',
          icon: ''
        });
      }
    }
  }, 1000);
}

function pauseTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  lockDurationPicker(false);
  setTimerBadge('paused');
  btnStart.disabled = false;
  btnStop.disabled  = true;
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = timerDuration;
  lockDurationPicker(false);
  setTimerBadge('ready');
  btnStart.disabled = false;
  btnStop.disabled  = true;
  renderTimer();
}

btnStart.addEventListener('click', startTimer);
btnStop.addEventListener('click',  pauseTimer);
btnReset.addEventListener('click', resetTimer);

// Preset pill clicks
document.getElementById('timer-duration-pills').addEventListener('click', function (e) {
  var pill = e.target.closest('.duration-pill');
  if (!pill) return;
  applyDuration(parseInt(pill.dataset.minutes, 10));
});

// Free-text custom duration (apply on Enter or blur)
durationInput.addEventListener('change', function () {
  applyDuration(durationInput.value);
});
durationInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') applyDuration(durationInput.value);
});

// Request notification permission on load
if (Notification && Notification.permission === 'default') {
  Notification.requestPermission();
}

/* =========================================
   QUICK LINKS
   ========================================= */
const LINKS_KEY = 'lifedashboard_links_v1';
let quickLinks  = [];

function loadLinks() {
  try {
    const raw = localStorage.getItem(LINKS_KEY);
    quickLinks = raw ? JSON.parse(raw) : [];
  } catch {
    quickLinks = [];
  }
}

function saveLinks() {
  localStorage.setItem(LINKS_KEY, JSON.stringify(quickLinks));
}

function renderLinks() {
  const list     = document.getElementById('links-list');
  const emptyEl  = document.getElementById('links-empty');

  if (quickLinks.length === 0) {
    list.innerHTML = '';
    emptyEl.classList.add('visible');
    return;
  }

  emptyEl.classList.remove('visible');
  list.innerHTML = quickLinks.map(function (link) {
    return `
      <li class="link-item" data-link-id="${link.id}">
        <a class="link-anchor"
           href="${escapeHtml(link.url)}"
           target="_blank"
           rel="noopener noreferrer"
           title="${escapeHtml(link.url)}"
        >
          <span class="link-emoji">${link.emoji || '🌐'}</span>
          ${escapeHtml(link.name)}
        </a>
        <button class="link-delete-btn"
                data-link-action="delete"
                aria-label="Remove ${escapeHtml(link.name)}">✕</button>
      </li>
    `;
  }).join('');
}

// event delegation on the links list
document.getElementById('links-list').addEventListener('click', function (e) {
  var btn = e.target.closest('button[data-link-action]');
  if (!btn) return;
  var li = btn.closest('[data-link-id]');
  if (!li) return;
  var id = li.dataset.linkId;
  if (btn.dataset.linkAction === 'delete') {
    quickLinks = quickLinks.filter(function (l) { return l.id !== id; });
    saveLinks();
    renderLinks();
  }
});

/* Quick link modal wiring */
const linkModalOverlay = document.getElementById('link-modal-overlay');
const linkForm         = document.getElementById('link-form');

function openLinkModal() {
  document.getElementById('link-name').value  = '';
  document.getElementById('link-url').value   = '';
  document.getElementById('link-emoji').value = '';
  document.getElementById('link-name-error').textContent = '';
  document.getElementById('link-url-error').textContent  = '';
  linkModalOverlay.setAttribute('aria-hidden', 'false');
  linkModalOverlay.classList.add('open');
  document.getElementById('link-name').focus();
}

function closeLinkModal() {
  linkModalOverlay.classList.remove('open');
  linkModalOverlay.setAttribute('aria-hidden', 'true');
}

document.getElementById('add-link-btn').addEventListener('click', openLinkModal);
document.getElementById('link-modal-close').addEventListener('click', closeLinkModal);
document.getElementById('link-cancel-btn').addEventListener('click', closeLinkModal);

linkModalOverlay.addEventListener('click', function (e) {
  if (e.target === linkModalOverlay) closeLinkModal();
});

linkForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var name  = document.getElementById('link-name').value.trim();
  var url   = document.getElementById('link-url').value.trim();
  var emoji = document.getElementById('link-emoji').value.trim();
  var valid = true;

  document.getElementById('link-name-error').textContent = '';
  document.getElementById('link-url-error').textContent  = '';

  if (!name) {
    document.getElementById('link-name-error').textContent = 'Label is required.';
    valid = false;
  }
  if (!url) {
    document.getElementById('link-url-error').textContent = 'URL is required.';
    valid = false;
  } else if (!/^https?:\/\//i.test(url)) {
    // auto-prepend https:// if missing
    url = 'https://' + url;
  }

  if (!valid) return;

  quickLinks.push({ id: generateId(), name: name, url: url, emoji: emoji || '🌐' });
  saveLinks();
  closeLinkModal();
  renderLinks();
});

/* =========================================
   INIT
   ========================================= */
function init() {
  loadTheme();            // Challenge 1 — apply saved theme before first paint
  loadTasks();
  loadLinks();
  loadName();             // Challenge 2 — populate name input from localStorage
  updateClock();
  updateGreeting();       // uses saved name immediately
  setInterval(updateClock, 1000);
  setInterval(updateGreeting, 60 * 1000);
  applyDuration(timerMinutes); // Challenge 3 — restore saved duration + sync pills
  updateSidebar();
  renderTasks();
  renderLinks();
}

init();
