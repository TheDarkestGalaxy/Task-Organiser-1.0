const STORAGE_KEY = "task-organiser-tasks";

const IMPORTANCE_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const IMPORTANCE_FILTERS = new Set(["low", "medium", "high", "critical"]);

let tasks = loadTasks();
let activeFilter = "all";

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
const statusFilters = document.getElementById("status-filters");
const importanceFilters = document.getElementById("importance-filters");
const categoryFilters = document.getElementById("category-filters");
const categoryFilterGroup = document.getElementById("category-filter-group");

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

statusFilters.addEventListener("click", handleFilterClick);
importanceFilters.addEventListener("click", handleFilterClick);
categoryFilters.addEventListener("click", handleFilterClick);

function handleFilterClick(e) {
  const btn = e.target.closest(".nav-btn, .filter-btn");
  if (!btn) return;

  document.querySelectorAll(".nav-btn, .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  activeFilter = btn.dataset.filter;
  render();
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

  taskList.querySelectorAll(".complete-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.closest(".task-card").dataset.id;
      const task = tasks.find((t) => t.id === id);
      if (task) {
        task.completed = checkbox.checked;
        task.completedAt = checkbox.checked ? new Date().toISOString() : null;
        saveTasks();
        render();
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
        render();
      }
    });
  });

  taskList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".task-card").dataset.id;
      tasks = tasks.filter((t) => t.id !== id);
      saveTasks();
      render();
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
