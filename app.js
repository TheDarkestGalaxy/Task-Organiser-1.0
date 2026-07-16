const STORAGE_KEY = "task-organiser-tasks";
const DAILY_ITEMS_KEY = "task-organiser-daily-items";
const DAILY_LOG_KEY = "task-organiser-daily-log";

const IMPORTANCE_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const IMPORTANCE_FILTERS = new Set(["low", "medium", "high", "critical"]);

let tasks = loadTasks();
let dailyItems = loadDailyItems();
let dailyLog = loadDailyLog();
let activeFilter = "all";
let activeView = "tasks";

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const importanceSelect = document.getElementById("task-importance");
const dueDateInput = document.getElementById("task-due-date");
const categoryInput = document.getElementById("task-category");
const categorySuggestions = document.getElementById("category-suggestions");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const taskCount = document.getElementById("task-count");
const statActive = document.getElementById("stat-active");
const statOverdue = document.getElementById("stat-overdue");
const statDone = document.getElementById("stat-done");
const statLabels = document.querySelectorAll(".stat-label");
const statusFilters = document.getElementById("status-filters");
const importanceFilters = document.getElementById("importance-filters");
const categoryFilters = document.getElementById("category-filters");
const categoryFilterGroup = document.getElementById("category-filter-group");
const taskFilters = document.getElementById("task-filters");
const viewTasks = document.getElementById("view-tasks");
const viewDaily = document.getElementById("view-daily");

const dailyForm = document.getElementById("daily-form");
const dailyTitleInput = document.getElementById("daily-title");
const dailyList = document.getElementById("daily-list");
const dailyEmpty = document.getElementById("daily-empty");
const dailyDateLabel = document.getElementById("daily-date-label");
const dailyProgressText = document.getElementById("daily-progress-text");
const dailyProgressFill = document.getElementById("daily-progress-fill");

document.querySelectorAll(".view-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeView = btn.dataset.view;
    switchView();
  });
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  const task = {
    id: crypto.randomUUID(),
    title,
    description: descriptionInput.value.trim(),
    importance: importanceSelect.value,
    dueDate: dueDateInput.value || null,
    category: categoryInput.value.trim(),
    bookmarked: false,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(task);
  saveTasks();
  render();

  form.reset();
  importanceSelect.value = "medium";
  titleInput.focus();
});

dailyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = dailyTitleInput.value.trim();
  if (!title) return;

  dailyItems.push({
    id: crypto.randomUUID(),
    title,
    createdAt: new Date().toISOString(),
  });

  saveDailyItems();
  renderDaily();

  dailyForm.reset();
  dailyTitleInput.focus();
});

statusFilters.addEventListener("click", handleFilterClick);
importanceFilters.addEventListener("click", handleFilterClick);
categoryFilters.addEventListener("click", handleFilterClick);

function handleFilterClick(e) {
  if (activeView !== "tasks") return;
  const btn = e.target.closest(".nav-btn, .filter-btn");
  if (!btn || btn.classList.contains("view-btn")) return;

  document.querySelectorAll("#task-filters .nav-btn, #task-filters .filter-btn").forEach((b) =>
    b.classList.remove("active")
  );
  btn.classList.add("active");
  activeFilter = btn.dataset.filter;
  renderTasks();
}

function switchView() {
  const isTasks = activeView === "tasks";

  viewTasks.classList.toggle("hidden", !isTasks);
  viewDaily.classList.toggle("hidden", isTasks);
  taskFilters.classList.toggle("hidden", !isTasks);

  if (isTasks) {
    statLabels[0].textContent = "Active";
    statLabels[1].textContent = "Overdue";
    statLabels[2].textContent = "Done";
    renderTasks();
  } else {
    statLabels[0].textContent = "Today";
    statLabels[1].textContent = "Left";
    statLabels[2].textContent = "Habits";
    renderDaily();
  }
}

function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTodayCompletions() {
  const today = getTodayKey();
  if (!dailyLog[today]) dailyLog[today] = [];
  return dailyLog[today];
}

function isDoneToday(id) {
  return getTodayCompletions().includes(id);
}

function toggleDailyCompletion(id) {
  const today = getTodayKey();
  if (!dailyLog[today]) dailyLog[today] = [];

  const idx = dailyLog[today].indexOf(id);
  if (idx === -1) {
    dailyLog[today].push(id);
  } else {
    dailyLog[today].splice(idx, 1);
  }

  saveDailyLog();
}

function getStreak(id) {
  let streak = 0;
  const d = startOfDay(new Date());

  while (true) {
    const key = formatDateKey(d);
    if (dailyLog[key] && dailyLog[key].includes(id)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored).map((task) => ({
      completed: false,
      completedAt: null,
      dueDate: null,
      category: "",
      ...task,
    }));
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadDailyItems() {
  try {
    const stored = localStorage.getItem(DAILY_ITEMS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveDailyItems() {
  localStorage.setItem(DAILY_ITEMS_KEY, JSON.stringify(dailyItems));
}

function loadDailyLog() {
  try {
    const stored = localStorage.getItem(DAILY_LOG_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveDailyLog() {
  localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(dailyLog));
}

function getCategories() {
  const cats = new Set();
  tasks.forEach((t) => {
    if (t.category) cats.add(t.category);
  });
  return [...cats].sort((a, b) => a.localeCompare(b));
}

function getFilteredTasks() {
  if (activeFilter === "all") return tasks;
  if (activeFilter === "active") return tasks.filter((t) => !t.completed);
  if (activeFilter === "completed") return tasks.filter((t) => t.completed);
  if (activeFilter === "bookmarked") return tasks.filter((t) => t.bookmarked);
  if (IMPORTANCE_FILTERS.has(activeFilter)) {
    return tasks.filter((t) => t.importance === activeFilter);
  }
  if (activeFilter.startsWith("cat:")) {
    const cat = decodeURIComponent(activeFilter.slice(4));
    return tasks.filter((t) => t.category === cat);
  }
  return tasks;
}

function sortTasks(list) {
  const today = startOfDay(new Date());

  return [...list].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.completed && !b.completed && a.bookmarked !== b.bookmarked) {
      return a.bookmarked ? -1 : 1;
    }

    const aDue = a.dueDate ? startOfDay(new Date(a.dueDate + "T00:00:00")) : null;
    const bDue = b.dueDate ? startOfDay(new Date(b.dueDate + "T00:00:00")) : null;

    if (!a.completed && !b.completed) {
      const aOverdue = aDue && aDue < today;
      const bOverdue = bDue && bDue < today;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

      if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
        return aDue - bDue;
      }
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
    }

    const impDiff = IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance];
    if (impDiff !== 0) return impDiff;

    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function sortDailyItems(list) {
  return [...list].sort((a, b) => {
    const aDone = isDoneToday(a.id);
    const bDone = isDoneToday(b.id);
    if (aDone !== bDone) return aDone ? 1 : -1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDueDate(dateStr) {
  const due = startOfDay(new Date(dateStr + "T00:00:00"));
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (due.getTime() === today.getTime()) return "Due today";
  if (due.getTime() === tomorrow.getTime()) return "Due tomorrow";

  return "Due " + due.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTodayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getDueDateStatus(task) {
  if (!task.dueDate || task.completed) return "";
  const due = startOfDay(new Date(task.dueDate + "T00:00:00"));
  const today = startOfDay(new Date());
  if (due < today) return "overdue";
  if (due.getTime() === today.getTime()) return "today";
  return "";
}

function renderCategoryFilters() {
  const categories = getCategories();
  if (categories.length === 0) {
    categoryFilterGroup.classList.add("hidden");
    return;
  }

  categoryFilterGroup.classList.remove("hidden");
  categoryFilters.innerHTML = categories
    .map(
      (cat) =>
        `<button class="nav-btn filter-btn${activeFilter === categoryFilterKey(cat) ? " active" : ""}" data-filter="${categoryFilterKey(cat)}">${escapeHtml(cat)}</button>`
    )
    .join("");
}

function renderCategorySuggestions() {
  categorySuggestions.innerHTML = getCategories()
    .map((cat) => `<option value="${escapeAttr(cat)}"></option>`)
    .join("");
}

function categoryFilterKey(cat) {
  return "cat:" + encodeURIComponent(cat);
}

function render() {
  if (activeView === "tasks") {
    renderTasks();
  } else {
    renderDaily();
  }
}

function renderTasks() {
  renderCategoryFilters();
  renderCategorySuggestions();

  const filtered = sortTasks(getFilteredTasks());
  const activeCount = tasks.filter((t) => !t.completed).length;
  const doneCount = tasks.filter((t) => t.completed).length;
  const overdueCount = tasks.filter((t) => !t.completed && getDueDateStatus(t) === "overdue").length;

  statActive.textContent = activeCount;
  statOverdue.textContent = overdueCount;
  statDone.textContent = doneCount;
  taskCount.textContent = `${filtered.length} shown`;

  if (filtered.length === 0) {
    taskList.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.querySelector(".empty-title").textContent =
      activeFilter === "all" ? "No tasks yet" : "No matching tasks";
    emptyState.querySelector(".empty-subtitle").textContent =
      activeFilter === "all"
        ? "Create your first task above to get started"
        : "Try a different filter or create a new task";
    return;
  }

  taskList.classList.remove("hidden");
  emptyState.classList.add("hidden");

  taskList.innerHTML = filtered.map(renderTaskCard).join("");
  bindTaskEvents();
}

function renderDaily() {
  const sorted = sortDailyItems(dailyItems);
  const doneToday = dailyItems.filter((item) => isDoneToday(item.id)).length;
  const total = dailyItems.length;
  const remaining = total - doneToday;
  const pct = total > 0 ? Math.round((doneToday / total) * 100) : 0;

  dailyDateLabel.textContent = formatTodayLabel();
  dailyProgressText.textContent = `${doneToday} of ${total} done`;
  dailyProgressFill.style.width = `${pct}%`;

  statActive.textContent = doneToday;
  statOverdue.textContent = remaining;
  statDone.textContent = total;

  if (sorted.length === 0) {
    dailyList.classList.add("hidden");
    dailyEmpty.classList.remove("hidden");
    return;
  }

  dailyList.classList.remove("hidden");
  dailyEmpty.classList.add("hidden");

  dailyList.innerHTML = sorted.map(renderDailyCard).join("");
  bindDailyEvents();
}

function bindTaskEvents() {
  taskList.querySelectorAll(".complete-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.closest(".task-card").dataset.id;
      const task = tasks.find((t) => t.id === id);
      if (task) {
        task.completed = checkbox.checked;
        task.completedAt = checkbox.checked ? new Date().toISOString() : null;
        saveTasks();
        renderTasks();
      }
    });
  });

  taskList.querySelectorAll(".bookmark-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".task-card").dataset.id;
      const task = tasks.find((t) => t.id === id);
      if (task) {
        task.bookmarked = !task.bookmarked;
        saveTasks();
        renderTasks();
      }
    });
  });

  taskList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".task-card").dataset.id;
      tasks = tasks.filter((t) => t.id !== id);
      saveTasks();
      renderTasks();
    });
  });
}

function bindDailyEvents() {
  dailyList.querySelectorAll(".daily-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.closest(".task-card").dataset.id;
      toggleDailyCompletion(id);
      renderDaily();
    });
  });

  dailyList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".task-card").dataset.id;
      dailyItems = dailyItems.filter((item) => item.id !== id);
      Object.keys(dailyLog).forEach((date) => {
        dailyLog[date] = dailyLog[date].filter((itemId) => itemId !== id);
      });
      saveDailyItems();
      saveDailyLog();
      renderDaily();
    });
  });
}

function renderTaskCard(task) {
  const dueStatus = getDueDateStatus(task);
  const cardClasses = [
    "task-card",
    task.bookmarked ? "bookmarked" : "",
    task.completed ? "completed" : "",
    dueStatus,
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <li class="${cardClasses}" data-id="${task.id}">
      <label class="checkbox-wrapper" title="${task.completed ? "Mark incomplete" : "Mark complete"}">
        <input type="checkbox" class="complete-checkbox" ${task.completed ? "checked" : ""} aria-label="Mark task complete" />
        <span class="checkbox-custom"></span>
      </label>
      <div class="task-body">
        <div class="task-header">
          <span class="task-title">${escapeHtml(task.title)}</span>
          <span class="importance-badge ${task.importance}">${task.importance}</span>
          ${task.category ? `<span class="category-badge">${escapeHtml(task.category)}</span>` : ""}
        </div>
        ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ""}
        <p class="task-meta">
          ${task.dueDate ? `<span class="due-date ${dueStatus}">${formatDueDate(task.dueDate)}</span><span class="meta-sep">·</span>` : ""}
          <span>Created ${formatDateTime(task.createdAt)}</span>
          ${task.completed && task.completedAt ? `<span class="meta-sep">·</span><span>Done ${formatDateTime(task.completedAt)}</span>` : ""}
        </p>
      </div>
      <div class="task-actions">
        <button class="icon-btn bookmark-btn${task.bookmarked ? " bookmarked" : ""}" title="${task.bookmarked ? "Remove bookmark" : "Bookmark"}" aria-label="${task.bookmarked ? "Remove bookmark" : "Bookmark"}">
          ${task.bookmarked ? "★" : "☆"}
        </button>
        <button class="icon-btn delete-btn delete" title="Delete task" aria-label="Delete task">✕</button>
      </div>
    </li>
  `;
}

function renderDailyCard(item) {
  const done = isDoneToday(item.id);
  const streak = getStreak(item.id);
  const cardClasses = ["task-card", "daily-card", done ? "done" : ""].filter(Boolean).join(" ");

  return `
    <li class="${cardClasses}" data-id="${item.id}">
      <label class="checkbox-wrapper" title="${done ? "Mark not done today" : "Mark done for today"}">
        <input type="checkbox" class="complete-checkbox daily-checkbox" ${done ? "checked" : ""} aria-label="Mark done for today" />
        <span class="checkbox-custom"></span>
      </label>
      <div class="task-body">
        <span class="task-title">${escapeHtml(item.title)}</span>
        ${streak > 0 ? `<p class="daily-streak">🔥 ${streak} day streak</p>` : ""}
      </div>
      <div class="task-actions">
        <button class="icon-btn delete-btn delete" title="Remove habit" aria-label="Remove habit">✕</button>
      </div>
    </li>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

render();
