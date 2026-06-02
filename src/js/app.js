
//  TaskFlow - App Bootstrapper & Event Handlers


import {
  loadTodosState,
  addTodo,
  updateTodo,
  undoDeleteTodo,
  clearCompletedTodos,
} from "./taskManager.js";
import {
  initDarkMode,
  toggleDarkMode,
  setSearchQuery,
  setStatusFilter,
  setPriorityFilter,
  setCategoryFilter,
  syncActiveTabsHighlight,
  renderTodoList,
  closeEditModal,
  getEditingTodoId,
  showToast,
} from "./ui.js";

function bootstrapApp() {
  // Initial State Sync
  loadTodosState();
  initDarkMode();

  // Add New Task submission
  const addTaskForm = document.getElementById("add-task-form");
  if (addTaskForm) {
    addTaskForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const titleInput = document.getElementById("task-title");
      const descInput = document.getElementById("task-desc");
      const priorityInput = document.getElementById("task-priority");
      const categorySelect = document.getElementById("task-category");
      const dueInput = document.getElementById("task-due");

      if (!titleInput) return;

      const titleVal = titleInput.value.trim();
      if (!titleVal) return;

      // Safe date validation - Default to today if none assigned
      let dateVal = dueInput.value;
      if (!dateVal) {
        dateVal = new Date().toISOString().split("T")[0];
      }

      // Construct plain JS task via TaskManager
      addTodo(
        titleVal,
        descInput ? descInput.value.trim() : "",
        priorityInput ? priorityInput.value : "medium",
        categorySelect ? categorySelect.value : "personal",
        dateVal,
      );

      // Clear Quick form states
      titleInput.value = "";
      if (descInput) descInput.value = "";
      if (dueInput) dueInput.value = "";

      renderTodoList();
      showToast("Task added as active!");
    });
  }

  // Setup Interactive priority selection buttons click feedback
  const priorityButtons = document.querySelectorAll(
    "#priority-selector .priority-btn",
  );
  const hiddenPriorityInput = document.getElementById("task-priority");

  function renderPrioritySelectors(selectedVal) {
    priorityButtons.forEach((btn) => {
      const val = btn.getAttribute("data-val");
      if (val === selectedVal) {
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
      }
    });
  }

  // Init medium selector visual state at start
  renderPrioritySelectors("medium");

  priorityButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-val");
      if (val && hiddenPriorityInput) {
        hiddenPriorityInput.value = val;
        renderPrioritySelectors(val);
      }
    });
  });

  // Edit Modal Submit click
  const editTaskForm = document.getElementById("edit-task-form");
  if (editTaskForm) {
    editTaskForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const editingTodoId = getEditingTodoId();
      if (!editingTodoId) return;

      const editTitle = document.getElementById("edit-title");
      const editDesc = document.getElementById("edit-desc");
      const editPriority = document.getElementById("edit-priority");
      const editCategory = document.getElementById("edit-category");
      const editDue = document.getElementById("edit-due");

      if (editTitle) {
        updateTodo(editingTodoId, {
          title: editTitle.value.trim(),
          description: editDesc ? editDesc.value.trim() : "",
          priority: editPriority.value,
          category: editCategory.value,
          dueDate: editDue.value || new Date().toISOString().split("T")[0],
        });

        closeEditModal();
        renderTodoList();
        showToast("Task saved successfully!");
      }
    });
  }

  // Cancel and overlay actions for Edit Modal
  const cancelBtn = document.getElementById("modal-cancel-btn");
  const closeBtn = document.getElementById("modal-close-btn");
  const overlay = document.getElementById("edit-modal-overlay");

  if (cancelBtn) cancelBtn.addEventListener("click", closeEditModal);
  if (closeBtn) closeBtn.addEventListener("click", closeEditModal);
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeEditModal();
      }
    });
  }

  // Search Bar listener
  const searchInput = document.getElementById("search-bar");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      setSearchQuery(e.target.value);
      renderTodoList();
    });
  }

  // Select Priority filter listener
  const prioritySelect = document.getElementById("filter-priority");
  if (prioritySelect) {
    prioritySelect.addEventListener("change", (e) => {
      setPriorityFilter(e.target.value);
      renderTodoList();
    });
  }

  // Select Category filter listener
  const categorySelect = document.getElementById("filter-category");
  if (categorySelect) {
    categorySelect.addEventListener("change", (e) => {
      setCategoryFilter(e.target.value);
      renderTodoList();
    });
  }

  // Set Status filter tab triggers
  const tabsList = document.querySelectorAll("#status-filter-tabs .tab-btn");
  tabsList.forEach((tab) => {
    tab.addEventListener("click", () => {
      const val = tab.getAttribute("data-tab");
      if (val) {
        setStatusFilter(val);
        syncActiveTabsHighlight();
        renderTodoList();
      }
    });
  });

  // Clear Completed trigger click
  const clearCompletedBtn = document.getElementById("clear-completed-btn");
  if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener("click", () => {
      const count = clearCompletedTodos();
      if (count === 0) {
        showToast("You have no completed tasks to clear.");
        return;
      }

      renderTodoList();
      showToast(`Cleared ${count} completed tasks!`);
    });
  }

  // 11. Undo Button Trigger inside Notification Toast
  const toastUndoBtn = document.getElementById("toast-undo-btn");
  if (toastUndoBtn) {
    toastUndoBtn.addEventListener("click", () => {
      const restored = undoDeleteTodo();
      if (restored) {
        // Animate immediate hide of toast
        const toast = document.getElementById("toast-banner");
        if (toast) {
          toast.style.transform = "translate(-50%, 1.5rem)";
          toast.style.opacity = "0";
          setTimeout(() => {
            toast.classList.add("hidden");
          }, 300);
        }

        renderTodoList();
        showToast("Task restored successfully!");
      }
    });
  }

  // 12. Theme Switch Action click
  const darkModeBtn = document.getElementById("dark-mode-btn");
  if (darkModeBtn) {
    darkModeBtn.addEventListener("click", () => {
      const isDark = toggleDarkMode();

      if (isDark) {
        showToast("Switched to Dark Theme", false, 2000);
      } else {
        showToast("Switched to Light Theme", false, 2000);
      }
    });
  }

  // Final initial load
  syncActiveTabsHighlight();
  renderTodoList();
}

// on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapApp);
} else {
  bootstrapApp();
}
