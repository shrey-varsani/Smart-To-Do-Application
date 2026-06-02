//  UI Coordinator & View Model (Rendering, Toasts, Filters, Search, Dark Mode, Drag-And-Drop)

import {
  getTodos,
  toggleTodoCompleted,
  deleteTodo,
  stripEmojis,
  reorderTodos,
} from "./taskManager.js";
import { getStorageItem, setStorageItem, DARK_MODE_KEY } from "./storage.js";

let toastTimeout = null;
let editingTodoId = null;
let searchQuery = "";
let statusFilter = "all"; // 'all' | 'active' | 'completed'
let priorityFilter = "all"; // 'all' | 'low' | 'medium' | 'high'
let categoryFilter = "all"; // 'all' | 'work' | 'personal' | 'shopping' | 'ideas'
let isDarkMode = false;

export function getEditingTodoId() {
  return editingTodoId;
}

export function setEditingTodoId(id) {
  editingTodoId = id;
}

export function getSearchQuery() {
  return searchQuery;
}

export function setSearchQuery(query) {
  searchQuery = query || "";
}

export function getStatusFilter() {
  return statusFilter;
}

export function setStatusFilter(val) {
  statusFilter = val;
}

export function getPriorityFilter() {
  return priorityFilter;
}

export function setPriorityFilter(val) {
  priorityFilter = val;
}

export function getCategoryFilter() {
  return categoryFilter;
}

export function setCategoryFilter(val) {
  categoryFilter = val;
}

export function syncActiveTabsHighlight() {
  const tabs = ["all", "active", "completed"];
  tabs.forEach((tabName) => {
    const btn = document.getElementById(`btn-tab-${tabName}`);
    if (!btn) return;

    if (statusFilter === tabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

export function initDarkMode() {
  try {
    const savedDark = getStorageItem(DARK_MODE_KEY);
    if (savedDark === "true") {
      isDarkMode = true;
      document.documentElement.classList.add("dark");
    } else {
      isDarkMode = false;
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {
    isDarkMode = false;
  }
  return isDarkMode;
}

export function getDarkModeState() {
  return isDarkMode;
}

export function setDarkModeState(state) {
  isDarkMode = !!state;
  setStorageItem(DARK_MODE_KEY, isDarkMode ? "true" : "false");
  if (isDarkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  return isDarkMode;
}

export function toggleDarkMode() {
  return setDarkModeState(!isDarkMode);
}

export function showToast(message, showsUndo = false, duration = 2000) {
  const toast = document.getElementById("toast-banner");
  const msgEl = document.getElementById("toast-message");
  const undoBtn = document.getElementById("toast-undo-btn");

  if (!toast || !msgEl || !undoBtn) return;

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  msgEl.textContent = message;

  if (showsUndo) {
    undoBtn.classList.remove("hidden");
    undoBtn.style.display = "flex";
  } else {
    undoBtn.classList.add("hidden");
    undoBtn.style.display = "none";
  }

  // Activating slide up and show animations
  toast.classList.remove("hidden");

  // Minimal deferment for transitions to fire nicely
  setTimeout(() => {
    toast.style.transform = "translate(-50%, 0)";
    toast.style.opacity = "1";
  }, 20);

  toastTimeout = setTimeout(() => {
    toast.style.transform = "translate(-50%, 1.5rem)";
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 300);
  }, duration);
}

export function calculateDashboardStats() {
  const progressLabel = document.getElementById("header-progress-label");
  const percentageLabel = document.getElementById("completion-percentage");
  const briefLabel = document.getElementById("completion-stats-brief");
  const remainingBadge = document.getElementById("remaining-count-badge");
  const overlayDial = document.getElementById("progress-dial-overlay");

  if (!progressLabel || !percentageLabel || !briefLabel || !remainingBadge)
    return;

  const todos = getTodos();
  const total = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const remainingCount = total - completedCount;
  let percent = 0;

  if (total > 0) {
    percent = Math.round((completedCount / total) * 100);
  }

  // Update dynamic content
  progressLabel.textContent = `Completed: ${completedCount}/${total} (${percent}%)`;
  percentageLabel.textContent = `${percent}%`;
  briefLabel.textContent = `${completedCount} of ${total} tasks completed`;
  remainingBadge.textContent = `${remainingCount} left`;

  // Draw circle clipping percentage overlay
  if (overlayDial) {
    if (percent === 100) {
      overlayDial.style.clipPath = "none";
      overlayDial.classList.add("complete");
    } else {
      overlayDial.classList.remove("complete");
      // Set clip-path box height to visualize progress from bottom to top
      const clipHeight = 100 - percent;
      overlayDial.style.clipPath = `inset(${clipHeight}% 0px 0px 0px)`;
    }
  }
}

export function formatDisplayDate(dateString) {
  if (!dateString) return "No due date";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  try {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${months[monthIdx]} ${day}, ${year}`;
    }
    const d = new Date(dateString);
    return isNaN(d.getTime())
      ? dateString
      : `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch (e) {
    return dateString;
  }
}

export function getDueDateFlag(dateString) {
  if (!dateString) return "none";
  const today = new Date().toISOString().split("T")[0];
  if (dateString === today) return "today";
  if (dateString < today) return "overdue";
  return "future";
}

export function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function bindDragDropEvents(
  card,
  todo,
  container,
  renderCallback,
  toastCallback,
) {
  card.addEventListener("dragstart", (e) => {
    // Prevent drag initiation from inner form/checkbox/button inputs
    if (
      e.target.closest(".toggle-checkbox-btn") ||
      e.target.closest(".card-actions-panel") ||
      e.target.closest("button")
    ) {
      e.preventDefault();
      return;
    }

    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", todo.id);

    setTimeout(() => {
      card.style.opacity = "0.35";
    }, 0);
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    card.style.opacity = "";

    const allCards = container.querySelectorAll(".todo-card");
    allCards.forEach((c) => {
      c.classList.remove("drag-over");
    });
  });

  card.addEventListener("dragover", (e) => {
    e.preventDefault();
    const draggingElement = container.querySelector(".dragging");
    if (draggingElement && draggingElement !== card) {
      card.classList.add("drag-over");
    }
  });

  card.addEventListener("dragenter", (e) => {
    e.preventDefault();
  });

  card.addEventListener("dragleave", () => {
    card.classList.remove("drag-over");
  });

  card.addEventListener("drop", (e) => {
    e.preventDefault();
    card.classList.remove("drag-over");

    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === todo.id) return;

    const success = reorderTodos(draggedId, todo.id);
    if (success) {
      renderCallback();
      if (toastCallback) {
        toastCallback("Task reordered successfully!");
      }
    }
  });
}

export function renderTodoList() {
  const container = document.getElementById("todo-list-container");
  const feedHeading = document.getElementById("feed-count-heading");

  if (!container) return;

  container.innerHTML = "";

  const todos = getTodos();
  const searchQuery = getSearchQuery();
  const statusFilter = getStatusFilter();
  const priorityFilter = getPriorityFilter();
  const categoryFilter = getCategoryFilter();

  const filteredTodos = todos.filter((todo) => {
    const query = searchQuery.trim().toLowerCase();
    const textMatch =
      !query ||
      todo.title.toLowerCase().includes(query) ||
      (todo.description && todo.description.toLowerCase().includes(query));

    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && !todo.completed) ||
      (statusFilter === "completed" && todo.completed);

    const priorityMatch =
      priorityFilter === "all" || todo.priority === priorityFilter;

    const categoryMatch =
      categoryFilter === "all" || todo.category === categoryFilter;

    return textMatch && statusMatch && priorityMatch && categoryMatch;
  });

  if (feedHeading) {
    feedHeading.textContent = `Todos (${filteredTodos.length})`;
  }

  if (filteredTodos.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "empty-placeholder-card";
    emptyCard.innerHTML = `
      <div class="empty-icon"></div>
      <h4 class="empty-title">No matching tasks found</h4>
      <p class="empty-subtitle">Try refining your selection criteria, clearing search keywords, or creating a brand new task above!</p>
      ${
        searchQuery ||
        statusFilter !== "all" ||
        priorityFilter !== "all" ||
        categoryFilter !== "all"
          ? `
        <button id="reset-filters-btn" class="btn-filter-reset">Reset Active Filters</button>
      `
          : ""
      }
    `;
    container.appendChild(emptyCard);

    const resetBtn = document.getElementById("reset-filters-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        setSearchQuery("");
        setStatusFilter("all");
        setPriorityFilter("all");
        setCategoryFilter("all");

        const searchInput = document.getElementById("search-bar");
        if (searchInput) searchInput.value = "";

        const prioritySelect = document.getElementById("filter-priority");
        if (prioritySelect) prioritySelect.value = "all";

        const categorySelect = document.getElementById("filter-category");
        if (categorySelect) categorySelect.value = "all";

        syncActiveTabsHighlight();
        renderTodoList();
      });
    }

    calculateDashboardStats();
    return;
  }

  filteredTodos.forEach((todo) => {
    const card = document.createElement("div");
    card.className = `todo-card${todo.completed ? " completed" : ""}`;
    card.setAttribute("draggable", "true");
    card.setAttribute("data-id", todo.id);

    let priorityClass = `badge-priority-${todo.priority}`;

    let categoryClass = `badge-category-${todo.category}`;

    const dueFlag = getDueDateFlag(todo.dueDate);
    let alertClass = "";
    let alertMessage = "";
    if (!todo.completed) {
      if (dueFlag === "overdue") {
        alertClass = " overdue";
        alertMessage = " (Overdue)";
      } else if (dueFlag === "today") {
        alertClass = " today";
        alertMessage = " (Today)";
      }
    }

    card.innerHTML = `
      <div class="card-checkbox-container">
        <button class="toggle-checkbox-btn" aria-label="Toggle completed status" data-id="${todo.id}"></button>
      </div>

      <div class="card-content">
        <h4 class="card-title">${escapeHTML(stripEmojis(todo.title))}</h4>
        ${todo.description ? `<p class="card-desc">${escapeHTML(todo.description)}</p>` : ""}

        <div class="card-badges-row">
          <span class="badge-tag ${priorityClass}">${todo.priority}</span>
          <span class="badge-tag ${categoryClass}">${todo.category}</span>
          <span class="badge-calendar-tag${alertClass}">
            ${formatDisplayDate(todo.dueDate)}${alertMessage}
          </span>
        </div>
      </div>

      <div class="card-actions-panel">
        <button class="btn-card-action btn-card-edit" data-id="${todo.id}" title="Edit task detail">Edit</button>
        <button class="btn-card-action btn-card-delete" data-id="${todo.id}" title="Delete task permanently">Delete</button>
      </div>
    `;

    const chkBtn = card.querySelector(".toggle-checkbox-btn");
    if (chkBtn) {
      chkBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const updated = toggleTodoCompleted(todo.id);
        renderTodoList();
        if (updated) {
          showToast(
            updated.completed
              ? "Task completed successfully!"
              : "Task returned to active deck.",
          );
        }
      });
    }

    const editBtn = card.querySelector(".btn-card-edit");
    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(todo);
      });
    }

    const deleteBtn = card.querySelector(".btn-card-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const deletedTask = deleteTodo(todo.id);
        if (deletedTask) {
          renderTodoList();
          showToast(`Deleted: "${todo.title}"`, true);
        }
      });
    }

    // Touch Long Press Interaction for Mobile Edit Trigger
    let touchTimer = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let isLongPressActive = false;

    card.addEventListener(
      "touchstart",
      (e) => {
        // Avoid firing on nested interactive elements
        if (
          e.target.closest(".toggle-checkbox-btn") ||
          e.target.closest(".card-actions-panel")
        ) {
          return;
        }

        isLongPressActive = false;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;

        // Tactile scale feedback when pressed down
        card.style.transform = "scale(0.975)";
        card.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.06)";
        card.style.transition = "transform 0.15s ease, box-shadow 0.15s ease";

        touchTimer = setTimeout(() => {
          isLongPressActive = true;

          // Polished short vibration haptic response
          if (navigator.vibrate) {
            try {
              navigator.vibrate(40);
            } catch (vibErr) {
              // Fail silent if blocked
            }
          }

          // Apply micro scale-up alert to verify long-press activation
          card.style.transform = "scale(1.02)";
          card.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1)";

          setTimeout(() => {
            card.style.transform = "";
            card.style.boxShadow = "";
            openEditModal(todo);
          }, 120);
        }, 600); // Comfortable standard premium delay
      },
      { passive: true },
    );

    card.addEventListener(
      "touchmove",
      (e) => {
        if (!touchTimer) return;

        const touch = e.touches[0];
        const diffX = Math.abs(touch.clientX - touchStartX);
        const diffY = Math.abs(touch.clientY - touchStartY);

        // Cancel if scrolled or dragged away
        if (diffX > 15 || diffY > 15) {
          clearTimeout(touchTimer);
          touchTimer = null;
          card.style.transform = "";
          card.style.boxShadow = "";
        }
      },
      { passive: true },
    );

    card.addEventListener("touchend", (e) => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }

      if (!isLongPressActive) {
        card.style.transform = "";
        card.style.boxShadow = "";
      } else {
        // Prevent default click event from dispatching post long-press edit
        e.preventDefault();
      }
    });

    card.addEventListener("touchcancel", () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
      card.style.transform = "";
      card.style.boxShadow = "";
    });

    bindDragDropEvents(card, todo, container, renderTodoList, showToast);

    container.appendChild(card);
  });

  calculateDashboardStats();
}

export function openEditModal(todo) {
  editingTodoId = todo.id;
  const overlay = document.getElementById("edit-modal-overlay");

  const editTitle = document.getElementById("edit-title");
  const editDesc = document.getElementById("edit-desc");
  const editPriority = document.getElementById("edit-priority");
  const editCategory = document.getElementById("edit-category");
  const editDue = document.getElementById("edit-due");

  if (
    !overlay ||
    !editTitle ||
    !editDesc ||
    !editPriority ||
    !editCategory ||
    !editDue
  )
    return;

  editTitle.value = todo.title;
  editDesc.value = todo.description || "";
  editPriority.value = todo.priority;
  editCategory.value = todo.category;
  editDue.value = todo.dueDate;

  overlay.classList.remove("hidden");
}

export function closeEditModal() {
  editingTodoId = null;
  const overlay = document.getElementById("edit-modal-overlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}
