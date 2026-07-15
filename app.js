const STORAGE_KEY = "task-organiser-tasks";

const IMPORTANCE_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

let tasks = loadTasks();
let activeFilter = "all";

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const importanceSelect = document.getElementById("task-importance");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const taskCount = document.getElementById("task-count");
const filterBtns = document.querySelectorAll(".filter-btn");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  const task = {
    id: crypto.randomUUID(),
    title,
    description: descriptionInput.value.trim(),
    importance: importanceSelect.value,
    bookmarked: false,
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(task);
  saveTasks();
  render();

  form.reset();
  importanceSelect.value = "medium";
  titleInput.focus();
});

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    render();
  });
});

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getFilteredTasks() {
  if (activeFilter === "all") return tasks;
  if (activeFilter === "bookmarked") return tasks.filter((t) => t.bookmarked);
  return tasks.filter((t) => t.importance === activeFilter);
}

function sortTasks(list) {
  return [...list].sort((a, b) => {
    if (a.bookmarked !== b.bookmarked) return a.bookmarked ? -1 : 1;
    const impDiff = IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance];
    if (impDiff !== 0) return impDiff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function render() {
  const filtered = sortTasks(getFilteredTasks());

  taskCount.textContent = `${filtered.length} task${filtered.length !== 1 ? "s" : ""}`;

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

  taskList.innerHTML = filtered
    .map(
      (task) => `
    <li class="task-card${task.bookmarked ? " bookmarked" : ""}" data-id="${task.id}">
      <div class="task-body">
        <div class="task-header">
          <span class="task-title">${escapeHtml(task.title)}</span>
          <span class="importance-badge ${task.importance}">${task.importance}</span>
        </div>
        ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ""}
        <p class="task-meta">Created ${formatDate(task.createdAt)}</p>
      </div>
      <div class="task-actions">
        <button class="icon-btn bookmark-btn${task.bookmarked ? " bookmarked" : ""}" title="${task.bookmarked ? "Remove bookmark" : "Bookmark"}" aria-label="${task.bookmarked ? "Remove bookmark" : "Bookmark"}">
          ${task.bookmarked ? "★" : "☆"}
        </button>
        <button class="icon-btn delete-btn delete" title="Delete task" aria-label="Delete task">✕</button>
      </div>
    </li>
  `
    )
    .join("");

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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

render();
