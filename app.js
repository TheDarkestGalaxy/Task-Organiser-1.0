const STORAGE_KEY = "task-organiser-tasks";
const DAILY_ITEMS_KEY = "task-organiser-daily-items";
const DAILY_LOG_KEY = "task-organiser-daily-log";
const GEMINI_KEY_STORAGE = "task-organiser-gemini-key";
const CHAT_HISTORY_KEY = "task-organiser-study-chat";

const IMPORTANCE_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const IMPORTANCE_FILTERS = new Set(["low", "medium", "high", "critical"]);
const WEEKDAY_DAYS = [1, 2, 3, 4, 5];
const WEEKEND_DAYS = [0, 6];
const EVERYDAY_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const STUDY_SYSTEM_PROMPT = `You are a friendly study tutor helping a student with schoolwork.
Explain concepts clearly in plain language. Break things into steps.
When asked for answers to homework, guide them to understand rather than only dumping the final answer — show the method, then the answer.
If a question is unclear, ask a short clarifying question.
Keep replies focused and useful for studying.`;

let tasks = loadTasks();
let dailyItems = loadDailyItems();
let dailyLog = loadDailyLog();
let chatHistory = loadChatHistory();
let activeFilter = "all";
let activeView = "tasks";
let calendarMonth = null;
let selectedCalDate = null;
let chatBusy = false;

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
const viewCalendar = document.getElementById("view-calendar");
const viewStudy = document.getElementById("view-study");

const dailyForm = document.getElementById("daily-form");
const dailyTitleInput = document.getElementById("daily-title");
const dailyRepeatSelect = document.getElementById("daily-repeat");
const dailyCustomDays = document.getElementById("daily-custom-days");
const dailyList = document.getElementById("daily-list");
const dailyEmpty = document.getElementById("daily-empty");
const dailyDateLabel = document.getElementById("daily-date-label");
const dailyProgressText = document.getElementById("daily-progress-text");
const dailyProgressFill = document.getElementById("daily-progress-fill");

const calendarGrid = document.getElementById("calendar-grid");
const calendarMonthLabel = document.getElementById("calendar-month-label");
const calendarDayTitle = document.getElementById("calendar-day-title");
const calendarDayList = document.getElementById("calendar-day-list");
const calendarDayEmpty = document.getElementById("calendar-day-empty");
const calendarSubtitle = document.getElementById("calendar-subtitle");
const calPrev = document.getElementById("cal-prev");
const calNext = document.getElementById("cal-next");
const calToday = document.getElementById("cal-today");

const studySetup = document.getElementById("study-setup");
const studyChat = document.getElementById("study-chat");
const studyKeyForm = document.getElementById("study-key-form");
const studyApiKeyInput = document.getElementById("study-api-key");
const studyClearBtn = document.getElementById("study-clear");
const studySettingsBtn = document.getElementById("study-settings-btn");
const studySetupBack = document.getElementById("study-setup-back");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatIncludeTasks = document.getElementById("chat-include-tasks");

const views = {
  tasks: viewTasks,
  daily: viewDaily,
  calendar: viewCalendar,
  study: viewStudy,
};

function ensureCalendarState() {
  if (!calendarMonth) calendarMonth = startOfMonth(new Date());
  if (!selectedCalDate) selectedCalDate = getTodayKey();
}

if (calPrev) {
  calPrev.addEventListener("click", () => {
    ensureCalendarState();
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    renderCalendar();
  });
}

if (calNext) {
  calNext.addEventListener("click", () => {
    ensureCalendarState();
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    renderCalendar();
  });
}

if (calToday) {
  calToday.addEventListener("click", () => {
    const now = new Date();
    calendarMonth = startOfMonth(now);
    selectedCalDate = getTodayKey();
    renderCalendar();
  });
}

document.querySelectorAll(".view-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const nextView = btn.dataset.view;
    if (!nextView || !views[nextView]) return;

    document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeView = nextView;
    switchView();
  });
});

if (studyKeyForm) {
  studyKeyForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const key = studyApiKeyInput.value.trim();
    if (!key) return;
    localStorage.setItem(GEMINI_KEY_STORAGE, key);
    studyApiKeyInput.value = "";
    renderStudy();
  });
}

if (studySettingsBtn) {
  studySettingsBtn.addEventListener("click", () => {
    studySetup.classList.remove("hidden");
    studyChat.classList.add("hidden");
    if (studySetupBack) studySetupBack.classList.toggle("hidden", !getGeminiKey());
    studyApiKeyInput.focus();
  });
}

if (studySetupBack) {
  studySetupBack.addEventListener("click", () => {
    renderStudy();
  });
}

if (studyClearBtn) {
  studyClearBtn.addEventListener("click", () => {
    chatHistory = [];
    saveChatHistory();
    renderChatMessages();
  });
}

if (chatForm) {
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await sendStudyMessage();
  });
}

if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.requestSubmit();
    }
  });
}

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

  const repeat = dailyRepeatSelect ? dailyRepeatSelect.value : "everyday";
  const days = getDaysForRepeat(repeat);
  if (days.length === 0) {
    alert("Pick at least one day for a custom schedule.");
    return;
  }

  dailyItems.push({
    id: crypto.randomUUID(),
    title,
    repeat,
    days,
    createdAt: new Date().toISOString(),
  });

  saveDailyItems();
  renderDaily();

  dailyForm.reset();
  if (dailyRepeatSelect) dailyRepeatSelect.value = "everyday";
  if (dailyCustomDays) dailyCustomDays.classList.add("hidden");
  dailyTitleInput.focus();
});

if (dailyRepeatSelect) {
  dailyRepeatSelect.addEventListener("change", () => {
    dailyCustomDays.classList.toggle("hidden", dailyRepeatSelect.value !== "custom");
  });
}

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
  Object.entries(views).forEach(([name, el]) => {
    if (!el) return;
    const show = name === activeView;
    el.classList.toggle("hidden", !show);
    el.setAttribute("aria-hidden", show ? "false" : "true");
  });

  if (taskFilters) {
    taskFilters.classList.toggle("hidden", activeView !== "tasks");
  }

  if (activeView === "tasks") {
    setStatLabels("Active", "Overdue", "Done");
    renderTasks();
    return;
  }

  if (activeView === "daily") {
    setStatLabels("Today", "Left", "Habits");
    renderDaily();
    return;
  }

  if (activeView === "calendar") {
    setStatLabels("Month", "Day", "Due");
    renderCalendar();
    return;
  }

  if (activeView === "study") {
    setStatLabels("Msgs", "Active", "Key");
    renderStudy();
  }
}

function setStatLabels(a, b, c) {
  statLabels[0].textContent = a;
  statLabels[1].textContent = b;
  statLabels[2].textContent = c;
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
  const item = dailyItems.find((h) => h.id === id);
  if (!item) return 0;

  let streak = 0;
  const d = startOfDay(new Date());

  // If today is a scheduled day and not done yet, start counting from yesterday
  if (isHabitDueOn(item, d) && !isDoneToday(id)) {
    d.setDate(d.getDate() - 1);
  }

  let guard = 0;
  while (guard < 400) {
    guard++;
    if (!isHabitDueOn(item, d)) {
      d.setDate(d.getDate() - 1);
      continue;
    }

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

function sortDailyItems(list) {
  return [...list].sort((a, b) => {
    const aDue = isHabitDueToday(a);
    const bDue = isHabitDueToday(b);
    if (aDue !== bDue) return aDue ? -1 : 1;

    if (aDue && bDue) {
      const aDone = isDoneToday(a.id);
      const bDone = isDoneToday(b.id);
      if (aDone !== bDone) return aDone ? 1 : -1;
    }

    return new Date(a.createdAt) - new Date(b.createdAt);
  });
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
    if (!stored) return [];
    return JSON.parse(stored).map(normalizeHabit);
  } catch {
    return [];
  }
}

function normalizeHabit(item) {
  const repeat = item.repeat || "everyday";
  let days = Array.isArray(item.days) ? item.days.map(Number) : null;
  if (!days || days.length === 0) {
    if (repeat === "weekdays") days = [...WEEKDAY_DAYS];
    else if (repeat === "weekends") days = [...WEEKEND_DAYS];
    else days = [...EVERYDAY_DAYS];
  }
  return {
    ...item,
    repeat,
    days,
  };
}

function getDaysForRepeat(repeat) {
  if (repeat === "weekdays") return [...WEEKDAY_DAYS];
  if (repeat === "weekends") return [...WEEKEND_DAYS];
  if (repeat === "custom") {
    if (!dailyCustomDays) return [];
    return [...dailyCustomDays.querySelectorAll("input:checked")].map((el) => Number(el.value));
  }
  return [...EVERYDAY_DAYS];
}

function isHabitDueOn(item, date = new Date()) {
  const habit = normalizeHabit(item);
  return habit.days.includes(date.getDay());
}

function isHabitDueToday(item) {
  return isHabitDueOn(item, new Date());
}

function getHabitsDueToday() {
  return dailyItems.filter(isHabitDueToday);
}

function formatScheduleLabel(item) {
  const habit = normalizeHabit(item);
  if (habit.repeat === "everyday" || arraysEqual(habit.days, EVERYDAY_DAYS)) return "Every day";
  if (habit.repeat === "weekdays" || arraysEqual(habit.days, WEEKDAY_DAYS)) return "Weekdays";
  if (habit.repeat === "weekends" || arraysEqual(habit.days, WEEKEND_DAYS)) return "Weekends";
  return DAY_ORDER.filter((d) => habit.days.includes(d)).map((d) => DAY_NAMES[d]).join(", ");
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
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

function loadChatHistory() {
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveChatHistory() {
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
}

function getGeminiKey() {
  return localStorage.getItem(GEMINI_KEY_STORAGE) || "";
}

function renderStudy() {
  const hasKey = Boolean(getGeminiKey());

  if (studySetup && studyChat) {
    studySetup.classList.toggle("hidden", hasKey);
    studyChat.classList.toggle("hidden", !hasKey);
  }

  const activeCount = tasks.filter((t) => !t.completed).length;
  statActive.textContent = chatHistory.filter((m) => m.role === "user").length;
  statOverdue.textContent = activeCount;
  statDone.textContent = hasKey ? "On" : "Off";

  if (hasKey) renderChatMessages();
}

function renderChatMessages() {
  if (!chatMessages) return;

  if (chatHistory.length === 0) {
    chatMessages.innerHTML = `
      <div class="chat-welcome">
        <strong>Ready to study</strong>
        Ask for explanations, help with homework steps, or a quick quiz on any topic.
      </div>
    `;
    return;
  }

  chatMessages.innerHTML = chatHistory
    .map(
      (msg) =>
        `<div class="chat-bubble ${msg.role === "user" ? "user" : msg.role === "error" ? "error" : "assistant"}">${escapeHtml(msg.content)}</div>`
    )
    .join("");

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function buildTaskContext() {
  const active = tasks.filter((t) => !t.completed).slice(0, 12);
  if (active.length === 0) return "";

  const lines = active.map((t) => {
    const bits = [`- ${t.title}`];
    if (t.category) bits.push(`(${t.category})`);
    if (t.dueDate) bits.push(`due ${t.dueDate}`);
    if (t.importance) bits.push(`[${t.importance}]`);
    if (t.description) bits.push(`— ${t.description}`);
    return bits.join(" ");
  });

  return `\n\nStudent's active tasks for context:\n${lines.join("\n")}`;
}

async function sendStudyMessage() {
  if (chatBusy || !chatInput) return;

  const text = chatInput.value.trim();
  if (!text) return;

  const apiKey = getGeminiKey();
  if (!apiKey) {
    renderStudy();
    return;
  }

  chatHistory.push({ role: "user", content: text });
  saveChatHistory();
  chatInput.value = "";
  renderChatMessages();

  const typing = document.createElement("div");
  typing.className = "chat-bubble assistant typing";
  typing.id = "chat-typing";
  typing.textContent = "Thinking…";
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  chatBusy = true;
  if (chatSend) chatSend.disabled = true;

  try {
    const includeTasks = chatIncludeTasks && chatIncludeTasks.checked;
    const reply = await askGemini(apiKey, text, includeTasks);
    chatHistory.push({ role: "assistant", content: reply });
  } catch (err) {
    chatHistory.push({
      role: "error",
      content: err.message || "Something went wrong talking to the AI.",
    });
  }

  saveChatHistory();
  chatBusy = false;
  if (chatSend) chatSend.disabled = false;
  renderChatMessages();
  renderStudy();
}

async function askGemini(apiKey, userText, includeTasks) {
  const recent = chatHistory
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-10);

  const contents = recent.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  if (!contents.length || contents[contents.length - 1].role !== "user") {
    contents.push({ role: "user", parts: [{ text: userText }] });
  }

  let systemText = STUDY_SYSTEM_PROMPT;
  if (includeTasks) systemText += buildTaskContext();

  const body = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const models = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];
  let lastError = "Could not reach the AI.";

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      lastError =
        data?.error?.message ||
        `API error (${res.status}). Check your API key or try again.`;
      continue;
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    if (!text.trim()) {
      lastError = "No response from the model. Try again in a moment.";
      continue;
    }

    return text.trim();
  }

  throw new Error(lastError);
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

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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
  } else if (activeView === "daily") {
    renderDaily();
  } else if (activeView === "calendar") {
    renderCalendar();
  } else if (activeView === "study") {
    renderStudy();
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
  const dueToday = getHabitsDueToday();
  const doneToday = dueToday.filter((item) => isDoneToday(item.id)).length;
  const total = dueToday.length;
  const remaining = total - doneToday;
  const pct = total > 0 ? Math.round((doneToday / total) * 100) : 0;

  dailyDateLabel.textContent = formatTodayLabel();
  dailyProgressText.textContent =
    total === 0 ? "Nothing scheduled today" : `${doneToday} of ${total} done`;
  dailyProgressFill.style.width = `${pct}%`;

  statActive.textContent = doneToday;
  statOverdue.textContent = remaining;
  statDone.textContent = dailyItems.length;

  if (sorted.length === 0) {
    dailyList.classList.add("hidden");
    dailyEmpty.classList.remove("hidden");
    dailyEmpty.querySelector(".empty-title").textContent = "No habits yet";
    dailyEmpty.querySelector(".empty-subtitle").textContent =
      "Add routines and choose how often they repeat";
    return;
  }

  dailyList.classList.remove("hidden");
  dailyEmpty.classList.add("hidden");

  dailyList.innerHTML = sorted.map(renderDailyCard).join("");
  bindDailyEvents();
}

function getTasksByDueDate() {
  const map = {};
  tasks.forEach((task) => {
    if (!task.dueDate) return;
    if (!map[task.dueDate]) map[task.dueDate] = [];
    map[task.dueDate].push(task);
  });
  Object.keys(map).forEach((key) => {
    map[key].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance];
    });
  });
  return map;
}

function renderCalendar() {
  if (!calendarGrid || !calendarMonthLabel || !viewCalendar) return;

  ensureCalendarState();

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const todayKey = getTodayKey();
  const byDate = getTasksByDueDate();

  calendarMonthLabel.textContent = calendarMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  // Monday-first calendar grid
  const firstDay = new Date(year, month, 1);
  let startWeekday = firstDay.getDay();
  startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), other: true });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), other: false });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, nextDay++), other: true });
  }

  const monthTaskCount = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate + "T00:00:00");
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  const selectedTasks = byDate[selectedCalDate] || [];

  statActive.textContent = monthTaskCount;
  statOverdue.textContent = selectedTasks.length;
  statDone.textContent = tasks.filter((t) => t.dueDate).length;
  if (calendarSubtitle) {
    calendarSubtitle.textContent = `${monthTaskCount} task${monthTaskCount !== 1 ? "s" : ""} due this month`;
  }

  calendarGrid.innerHTML = cells
    .map(({ date, other }) => {
      const key = formatDateKey(date);
      const dayTasks = byDate[key] || [];
      const visible = dayTasks.slice(0, 3);
      const extra = dayTasks.length - visible.length;
      const classes = [
        "cal-day",
        other ? "other-month" : "",
        key === todayKey ? "today" : "",
        key === selectedCalDate ? "selected" : "",
        dayTasks.length ? "has-tasks" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <button type="button" class="${classes}" data-date="${key}">
          <span class="cal-day-num">${date.getDate()}</span>
          <div class="cal-day-tasks">
            ${visible
              .map(
                (t) =>
                  `<span class="cal-chip ${t.importance}${t.completed ? " completed" : ""}">${escapeHtml(t.title)}</span>`
              )
              .join("")}
            ${extra > 0 ? `<span class="cal-more">+${extra} more</span>` : ""}
          </div>
        </button>
      `;
    })
    .join("");

  calendarGrid.querySelectorAll(".cal-day").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedCalDate = btn.dataset.date;
      const selectedDate = new Date(selectedCalDate + "T00:00:00");
      if (
        selectedDate.getMonth() !== calendarMonth.getMonth() ||
        selectedDate.getFullYear() !== calendarMonth.getFullYear()
      ) {
        calendarMonth = startOfMonth(selectedDate);
      }
      renderCalendar();
    });
  });

  renderCalendarDayPanel(selectedCalDate, selectedTasks);
}

function renderCalendarDayPanel(dateKey, dayTasks) {
  const date = new Date(dateKey + "T00:00:00");
  calendarDayTitle.textContent = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  if (dayTasks.length === 0) {
    calendarDayList.classList.add("hidden");
    calendarDayEmpty.classList.remove("hidden");
    calendarDayList.innerHTML = "";
    return;
  }

  calendarDayList.classList.remove("hidden");
  calendarDayEmpty.classList.add("hidden");
  calendarDayList.innerHTML = dayTasks.map(renderCalendarTaskCard).join("");

  calendarDayList.querySelectorAll(".complete-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.closest(".task-card").dataset.id;
      const task = tasks.find((t) => t.id === id);
      if (task) {
        task.completed = checkbox.checked;
        task.completedAt = checkbox.checked ? new Date().toISOString() : null;
        saveTasks();
        renderCalendar();
      }
    });
  });
}

function renderCalendarTaskCard(task) {
  const dueStatus = getDueDateStatus(task);
  const cardClasses = [
    "task-card",
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
      </div>
    </li>
  `;
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
  const dueToday = isHabitDueToday(item);
  const done = isDoneToday(item.id);
  const streak = getStreak(item.id);
  const schedule = formatScheduleLabel(item);
  const cardClasses = [
    "task-card",
    "daily-card",
    done && dueToday ? "done" : "",
    !dueToday ? "not-due" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <li class="${cardClasses}" data-id="${item.id}">
      <label class="checkbox-wrapper" title="${!dueToday ? "Not scheduled today" : done ? "Mark not done today" : "Mark done for today"}">
        <input type="checkbox" class="complete-checkbox daily-checkbox" ${done ? "checked" : ""} ${!dueToday ? "disabled" : ""} aria-label="Mark done for today" />
        <span class="checkbox-custom"></span>
      </label>
      <div class="task-body">
        <div class="task-header">
          <span class="task-title">${escapeHtml(item.title)}</span>
          <span class="schedule-badge">${escapeHtml(schedule)}</span>
        </div>
        <div class="daily-meta">
          ${!dueToday ? `<span class="daily-streak">Not scheduled today</span>` : ""}
          ${streak > 0 ? `<span class="daily-streak">🔥 ${streak} day streak</span>` : ""}
        </div>
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
