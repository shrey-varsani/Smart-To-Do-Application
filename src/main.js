/**
 * ==========================================================================
 * Google AI Studio - TaskFlow Engine (Pure Vanilla Javascript)
 * Key Highlights: HTML5 Drag & Drop, Local Storage, Priority/Category Filters,
 * Full Text Search, Non-Destructive Undo, and Immersive Dark Mode toggling.
 * ==========================================================================
 */

// Storage Keys
const STORAGE_KEY = 'smart_todo_app_data';
const DARK_MODE_KEY = 'smart_todo_dark_mode';

// Starter Pack Default Tasks
const DEFAULT_TODOS = [
  {
    id: 'starter-1',
    title: 'Walkthrough the clean, vanilla CSS layout',
    description: 'Notice how the glassmorphic cards and dark-mode transitions render smoothly without any external frameworks.',
    completed: true,
    priority: 'high',
    category: 'work',
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: Date.now() - 3600000 * 4,
  },
  {
    id: 'starter-2',
    title: 'Play with the HTML5 Drag & Drop feature',
    description: 'Hold a task by its title or anywhere within the card and drag it up/down to sort and save the list order.',
    completed: false,
    priority: 'high',
    category: 'work',
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'starter-3',
    title: 'Pick up fresh ingredients for dinner',
    description: 'Get bell peppers, chicken breasts, fresh basil, and some olive oil.',
    completed: false,
    priority: 'medium',
    category: 'shopping',
    dueDate: new Date(Date.now() + 86450000).toISOString().split('T')[0],
    createdAt: Date.now() - 3600000 * 1,
  },
  {
    id: 'starter-4',
    title: 'Sketch website layout ideas in notebook',
    description: 'Draft initial wireframes for a dashboard layout focusing on minimalist grids and generous spaces.',
    completed: false,
    priority: 'low',
    category: 'ideas',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    createdAt: Date.now(),
  },
];

// Active State Instance
let todos = [];
let searchQuery = '';
let statusFilter = 'all'; // 'all' | 'active' | 'completed'
let priorityFilter = 'all'; // 'all' | 'low' | 'medium' | 'high'
let categoryFilter = 'all'; // 'all' | 'work' | 'personal' | 'shopping' | 'ideas'
let isDarkMode = false;

// Undo Actions Buffer
let recentlyDeletedTodo = null;
let recentlyDeletedIndex = -1;
let toastTimeout = null;

// Modal Target Cache
let editingTodoId = null;

// ==========================================================================
// Initialization & Local Storage Handlers
// ==========================================================================
function loadAppState() {
  // Load Todos
  try {
    const rawTodos = localStorage.getItem(STORAGE_KEY);
    if (!rawTodos) {
      todos = [...DEFAULT_TODOS];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } else {
      todos = JSON.parse(rawTodos);
    }
  } catch (error) {
    console.error('Failed to parse saved tasks storage. Resetting...', error);
    todos = [...DEFAULT_TODOS];
  }

  // Load Dark Mode Configuration
  try {
    const savedDark = localStorage.getItem(DARK_MODE_KEY);
    if (savedDark === 'true') {
      isDarkMode = true;
      document.documentElement.classList.add('dark');
    } else {
      isDarkMode = false;
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    isDarkMode = false;
  }
}

function saveTodosState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (err) {
    console.error('Could not save to local storage:', err);
  }
}

// ==========================================================================
// Toast Notification Engine
// ==========================================================================
function showToast(message, showsUndo = false, duration = 2000) {
  const toast = document.getElementById('toast-banner');
  const msgEl = document.getElementById('toast-message');
  const undoBtn = document.getElementById('toast-undo-btn');

  if (!toast || !msgEl || !undoBtn) return;

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  msgEl.textContent = message;

  if (showsUndo) {
    undoBtn.classList.remove('hidden');
    undoBtn.style.display = 'flex';
  } else {
    undoBtn.classList.add('hidden');
    undoBtn.style.display = 'none';
  }

  // Activating slide up and show animations
  toast.classList.remove('hidden');
  
  // Minimal deferment for transitions to fire nicely
  setTimeout(() => {
    toast.style.transform = 'translate(-50%, 0)';
    toast.style.opacity = '1';
  }, 20);

  toastTimeout = setTimeout(() => {
    toast.style.transform = 'translate(-50%, 1.5rem)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 300);
  }, duration);
}

// ==========================================================================
// Advanced Calculations & Dashboard Stats overlays
// ==========================================================================
function calculateDashboardStats() {
  const progressLabel = document.getElementById('header-progress-label');
  const percentageLabel = document.getElementById('completion-percentage');
  const briefLabel = document.getElementById('completion-stats-brief');
  const remainingBadge = document.getElementById('remaining-count-badge');
  const overlayDial = document.getElementById('progress-dial-overlay');

  if (!progressLabel || !percentageLabel || !briefLabel || !remainingBadge) return;

  const total = todos.length;
  const completedCount = todos.filter(t => t.completed).length;
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
      overlayDial.style.clipPath = 'none';
      overlayDial.classList.add('complete');
    } else {
      overlayDial.classList.remove('complete');
      // Set clip-path box height to visualize progress from bottom to top
      const clipHeight = 100 - percent;
      overlayDial.style.clipPath = `inset(${clipHeight}% 0px 0px 0px)`;
    }
  }
}

// ==========================================================================
// Helper Utility Date Parsers (Local Safeties)
// ==========================================================================
function formatDisplayDate(dateString) {
  if (!dateString) return 'No due date';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${months[monthIdx]} ${day}, ${year}`;
    }
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? dateString : `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch (e) {
    return dateString;
  }
}

function getDueDateFlag(dateString) {
  if (!dateString) return 'none';
  const today = new Date().toISOString().split('T')[0];
  if (dateString === today) return 'today';
  if (dateString < today) return 'overdue';
  return 'future';
}

// ==========================================================================
// Main Todo List Renderer (DOM manipulation)
// ==========================================================================
function renderTodoList() {
  const container = document.getElementById('todo-list-container');
  const feedHeading = document.getElementById('feed-count-heading');

  if (!container) return;

  // Wipe current list items
  container.innerHTML = '';

  // Get active filters match
  const filteredTodos = todos.filter(todo => {
    // Search query parameters
    const query = searchQuery.trim().toLowerCase();
    const textMatch = !query || 
                      todo.title.toLowerCase().includes(query) || 
                      (todo.description && todo.description.toLowerCase().includes(query));

    // Status Filters
    const statusMatch = statusFilter === 'all' || 
                        (statusFilter === 'active' && !todo.completed) || 
                        (statusFilter === 'completed' && todo.completed);

    // Priorities
    const priorityMatch = priorityFilter === 'all' || todo.priority === priorityFilter;

    // Categories
    const categoryMatch = categoryFilter === 'all' || todo.category === categoryFilter;

    return textMatch && statusMatch && priorityMatch && categoryMatch;
  });

  // Write counter
  if (feedHeading) {
    feedHeading.textContent = `Todos (${filteredTodos.length})`;
  }

  // Handle No Items/Empty matching State
  if (filteredTodos.length === 0) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'empty-placeholder-card';
    emptyCard.innerHTML = `
      <div class="empty-icon">🔍</div>
      <h4 class="empty-title">No matching tasks found</h4>
      <p class="empty-subtitle">Try refining your selection criteria, clearing search keywords, or creating a brand new task above!</p>
      ${(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all') ? `
        <button id="reset-filters-btn" class="btn-filter-reset">Reset Active Filters</button>
      ` : ''}
    `;
    container.appendChild(emptyCard);

    // Bind action to reset filters
    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        searchQuery = '';
        statusFilter = 'all';
        priorityFilter = 'all';
        categoryFilter = 'all';

        // Update standard input fields back to defaults
        const searchInput = document.getElementById('search-bar');
        if (searchInput) searchInput.value = '';

        const prioritySelect = document.getElementById('filter-priority');
        if (prioritySelect) prioritySelect.value = 'all';

        const categorySelect = document.getElementById('filter-category');
        if (categorySelect) categorySelect.value = 'all';

        syncActiveTabsHighlight();
        renderTodoList();
      });
    }

    calculateDashboardStats();
    return;
  }

  // Iterate and output list of nodes
  filteredTodos.forEach((todo) => {
    const card = document.createElement('div');
    card.className = `todo-card${todo.completed ? ' completed' : ''}`;
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-id', todo.id);

    // Priority badge details
    let priorityClass = `badge-priority-${todo.priority}`;
    
    // Category badge details
    let categoryClass = `badge-category-${todo.category}`;

    // Due Date warning alerts
    const dueFlag = getDueDateFlag(todo.dueDate);
    let alertClass = '';
    let alertMessage = '';
    if (!todo.completed) {
      if (dueFlag === 'overdue') {
        alertClass = ' overdue';
        alertMessage = ' (Overdue)';
      } else if (dueFlag === 'today') {
        alertClass = ' today';
        alertMessage = ' (Today)';
      }
    }

    card.innerHTML = `
      <!-- Action Drag Handle -->
      <div class="card-grip-handle" title="Drag to reorder card sequence.">
        ⠿
      </div>

      <!-- Checked Checkbox control button -->
      <div class="card-checkbox-container">
        <button class="toggle-checkbox-btn" aria-label="Toggle completed status" data-id="${todo.id}"></button>
      </div>

      <!-- Main Todo Card Panel Text block -->
      <div class="card-content">
        <h4 class="card-title">${escapeHTML(todo.title)}</h4>
        ${todo.description ? `<p class="card-desc">${escapeHTML(todo.description)}</p>` : ''}

        <!-- Badge Row Deck -->
        <div class="card-badges-row">
          <span class="badge-tag ${priorityClass}">${todo.priority}</span>
          <span class="badge-tag ${categoryClass}">${todo.category}</span>
          <span class="badge-calendar-tag${alertClass}">
            ${formatDisplayDate(todo.dueDate)}${alertMessage}
          </span>
        </div>
      </div>

      <!-- Edit / Delete Desktop badge sliders -->
      <div class="card-actions-panel">
        <button class="btn-card-action btn-card-edit" data-id="${todo.id}" title="Edit task detail">Edit</button>
        <button class="btn-card-action btn-card-delete" data-id="${todo.id}" title="Delete task permanently">Delete</button>
      </div>
    `;

    // ----------------------------------------------------------------------
    // Event listeners bound directly to card node references (Safe execution)
    // ----------------------------------------------------------------------

    // Checkbox completed toggles clicks
    const chkBtn = card.querySelector('.toggle-checkbox-btn');
    if (chkBtn) {
      chkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        todo.completed = !todo.completed;
        saveTodosState();
        renderTodoList();
        showToast(todo.completed ? '🎉 Task completed successfully!' : 'Task returned to active deck.');
      });
    }

    // Edit action trigger clicks
    const editBtn = card.querySelector('.btn-card-edit');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(todo);
      });
    }

    // Delete actions triggers click
    const deleteBtn = card.querySelector('.btn-card-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const absoluteIndex = todos.findIndex(t => t.id === todo.id);
        if (absoluteIndex !== -1) {
          recentlyDeletedTodo = todos[absoluteIndex];
          recentlyDeletedIndex = absoluteIndex;

          todos.splice(absoluteIndex, 1);
          saveTodosState();
          renderTodoList();
          showToast(`Deleted: "${todo.title}"`, true);
        }
      });
    }

    // ----------------------------------------------------------------------
    // Touch Long Press Interaction for Mobile Edit Trigger
    // ----------------------------------------------------------------------
    let touchTimer = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let isLongPressActive = false;

    card.addEventListener('touchstart', (e) => {
      // Avoid firing on nested interactive elements
      if (e.target.closest('.toggle-checkbox-btn') || e.target.closest('.card-actions-panel')) {
        return;
      }

      isLongPressActive = false;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      // Tactile scale feedback when pressed down
      card.style.transform = 'scale(0.975)';
      card.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.06)';
      card.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';

      touchTimer = setTimeout(() => {
        isLongPressActive = true;
        
        // Polished short vibration for standard touch haptic response
        if (navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch (vibErr) {
            // Fail silent if blocked
          }
        }

        // Apply micro scale-up alert to verify long-press activation
        card.style.transform = 'scale(1.02)';
        card.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';

        setTimeout(() => {
          card.style.transform = '';
          card.style.boxShadow = '';
          openEditModal(todo);
        }, 120);

      }, 600); // Comfortable standard premium delay
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
      if (!touchTimer) return;

      const touch = e.touches[0];
      const diffX = Math.abs(touch.clientX - touchStartX);
      const diffY = Math.abs(touch.clientY - touchStartY);

      // Cancel if scrolled or dragged away
      if (diffX > 15 || diffY > 15) {
        clearTimeout(touchTimer);
        touchTimer = null;
        card.style.transform = '';
        card.style.boxShadow = '';
      }
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
      
      if (!isLongPressActive) {
        card.style.transform = '';
        card.style.boxShadow = '';
      } else {
        // Prevent default click event from dispatching post long-press edit
        e.preventDefault();
      }
    });

    card.addEventListener('touchcancel', () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
      card.style.transform = '';
      card.style.boxShadow = '';
    });

    // ==========================================================================
    // HTML5 Native Drag & Drop Handlers
    // ==========================================================================
    
    // 1. Drag Start: Store task ID and configure drag styles
    card.addEventListener('dragstart', (e) => {
      // Prevent drag initiation from inner form/button inputs
      if (e.target.closest('.toggle-checkbox-btn') || 
          e.target.closest('.card-actions-panel') || 
          e.target.closest('button')) {
        e.preventDefault();
        return;
      }

      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', todo.id);

      // Defer slightly to allow the browser to clone full-opacity element for drag-ghost
      setTimeout(() => {
        card.style.opacity = '0.35';
      }, 0);
    });

    // 2. Drag End: Reset local styles and clear all hover markers
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      card.style.opacity = '';
      
      const allCards = container.querySelectorAll('.todo-card');
      allCards.forEach(c => {
        c.classList.remove('drag-over');
      });
    });

    // 3. Drag Over: Necessary to permit dropped actions and visual target indicator
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingElement = container.querySelector('.dragging');
      if (draggingElement && draggingElement !== card) {
        card.classList.add('drag-over');
      }
    });

    // 4. Drag Enter: Prevent standard defaults
    card.addEventListener('dragenter', (e) => {
      e.preventDefault();
    });

    // 5. Drag Leave: Erase visual drag-over indicator
    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    // 6. Drop Event: Reorder underlying tasks index state & commit update
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');

      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId || draggedId === todo.id) return;

      const draggedIndex = todos.findIndex(t => t.id === draggedId);
      const targetIndex = todos.findIndex(t => t.id === todo.id);

      // Validation check to prevent execution of invalid drops (Requirement 9)
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Splice dragged task out and insert at the target's relative index
        const [movedTask] = todos.splice(draggedIndex, 1);
        todos.splice(targetIndex, 0, movedTask);

        // Save order and refresh UI immediately
        saveTodosState();
        renderTodoList();
        showToast('🎉 Task reordered successfully!');
      }
    });

    container.appendChild(card);
  });

  calculateDashboardStats();
}

// Helpers: Escape HTML injection strings securely
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// Status filter tab state management
// ==========================================================================
function syncActiveTabsHighlight() {
  const tabs = ['all', 'active', 'completed'];
  tabs.forEach(tabName => {
    const btn = document.getElementById(`btn-tab-${tabName}`);
    if (!btn) return;

    if (statusFilter === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// ==========================================================================
// Edit Modal Controls Dashboard
// ==========================================================================
function openEditModal(todo) {
  editingTodoId = todo.id;
  const overlay = document.getElementById('edit-modal-overlay');

  const editTitle = document.getElementById('edit-title');
  const editDesc = document.getElementById('edit-desc');
  const editPriority = document.getElementById('edit-priority');
  const editCategory = document.getElementById('edit-category');
  const editDue = document.getElementById('edit-due');

  if (!overlay || !editTitle || !editDesc || !editPriority || !editCategory || !editDue) return;

  // Bind values
  editTitle.value = todo.title;
  editDesc.value = todo.description || '';
  editPriority.value = todo.priority;
  editCategory.value = todo.category;
  editDue.value = todo.dueDate;

  // Reveal Modal Frame
  overlay.classList.remove('hidden');
}

function closeEditModal() {
  editingTodoId = null;
  const overlay = document.getElementById('edit-modal-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

// ==========================================================================
// Application Bootstrapper & Controls Deck binding
// ==========================================================================
function bootstrapApp() {
  // 1. Initial State Sync
  loadAppState();

  // 2. Add New Task submission
  const addTaskForm = document.getElementById('add-task-form');
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const titleInput = document.getElementById('task-title');
      const descInput = document.getElementById('task-desc');
      const priorityInput = document.getElementById('task-priority');
      const categorySelect = document.getElementById('task-category');
      const dueInput = document.getElementById('task-due');

      if (!titleInput) return;

      const titleVal = titleInput.value.trim();
      if (!titleVal) return;

      // Safe date validation - Default to today if none assigned
      let dateVal = dueInput.value;
      if (!dateVal) {
        dateVal = new Date().toISOString().split('T')[0];
      }

      // Construct plain JS task
      const newTask = {
        id: 'task-' + Math.random().toString(36).substring(2, 11),
        title: titleVal,
        description: descInput ? descInput.value.trim() : '',
        completed: false,
        priority: priorityInput ? priorityInput.value : 'medium',
        category: categorySelect ? categorySelect.value : 'personal',
        dueDate: dateVal,
        createdAt: Date.now()
      };

      // Unshift to list and write back
      todos.unshift(newTask);
      saveTodosState();

      // Clear Quick form states
      titleInput.value = '';
      if (descInput) descInput.value = '';
      if (dueInput) dueInput.value = '';

      renderTodoList();
      showToast('🚀 Task added as active!');
    });
  }

  // 3. Setup Interactive priority selection buttons click feedback
  const priorityButtons = document.querySelectorAll('#priority-selector .priority-btn');
  const hiddenPriorityInput = document.getElementById('task-priority');

  function renderPrioritySelectors(selectedVal) {
    priorityButtons.forEach(btn => {
      const val = btn.getAttribute('data-val');
      if (val === selectedVal) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  // Init medium selector visual state at start
  renderPrioritySelectors('medium');

  priorityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-val');
      if (val && hiddenPriorityInput) {
        hiddenPriorityInput.value = val;
        renderPrioritySelectors(val);
      }
    });
  });

  // 4. Edit Modal Submit click
  const editTaskForm = document.getElementById('edit-task-form');
  if (editTaskForm) {
    editTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!editingTodoId) return;

      const editTitle = document.getElementById('edit-title');
      const editDesc = document.getElementById('edit-desc');
      const editPriority = document.getElementById('edit-priority');
      const editCategory = document.getElementById('edit-category');
      const editDue = document.getElementById('edit-due');

      const index = todos.findIndex(t => t.id === editingTodoId);
      if (index !== -1 && editTitle) {
        todos[index].title = editTitle.value.trim();
        todos[index].description = editDesc ? editDesc.value.trim() : '';
        todos[index].priority = editPriority.value;
        todos[index].category = editCategory.value;
        todos[index].dueDate = editDue.value || new Date().toISOString().split('T')[0];

        saveTodosState();
        closeEditModal();
        renderTodoList();
        showToast('🛠️ Task saved successfully!');
      }
    });
  }

  // 5. Cancel and overlay actions for Edit Modal
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const closeBtn = document.getElementById('modal-close-btn');
  const overlay = document.getElementById('edit-modal-overlay');

  if (cancelBtn) cancelBtn.addEventListener('click', closeEditModal);
  if (closeBtn) closeBtn.addEventListener('click', closeEditModal);
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeEditModal();
      }
    });
  }

  // 6. Search Bar listener
  const searchInput = document.getElementById('search-bar');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderTodoList();
    });
  }

  // 7. Select Priority filter listener
  const prioritySelect = document.getElementById('filter-priority');
  if (prioritySelect) {
    prioritySelect.addEventListener('change', (e) => {
      priorityFilter = e.target.value;
      renderTodoList();
    });
  }

  // 8. Select Category filter listener
  const categorySelect = document.getElementById('filter-category');
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      categoryFilter = e.target.value;
      renderTodoList();
    });
  }

  // 9. Set Status filter tab triggers
  const tabsList = document.querySelectorAll('#status-filter-tabs .tab-btn');
  tabsList.forEach(tab => {
    tab.addEventListener('click', () => {
      const val = tab.getAttribute('data-tab');
      if (val) {
        statusFilter = val;
        syncActiveTabsHighlight();
        renderTodoList();
      }
    });
  });

  // 10. Clear Completed trigger click
  const clearCompletedBtn = document.getElementById('clear-completed-btn');
  if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', () => {
      const completedCount = todos.filter(t => t.completed).length;
      if (completedCount === 0) {
        showToast('You have no completed tasks to clear.');
        return;
      }

      todos = todos.filter(t => !t.completed);
      saveTodosState();
      renderTodoList();
      showToast(`🧹 Cleared ${completedCount} completed tasks!`);
    });
  }

  // 11. Undo Button Trigger inside Notification Toast
  const toastUndoBtn = document.getElementById('toast-undo-btn');
  if (toastUndoBtn) {
    toastUndoBtn.addEventListener('click', () => {
      if (recentlyDeletedTodo && recentlyDeletedIndex !== -1) {
        // Restore to original index position
        todos.splice(recentlyDeletedIndex, 0, recentlyDeletedTodo);
        saveTodosState();

        recentlyDeletedTodo = null;
        recentlyDeletedIndex = -1;

        // Animate immediate hide of toast
        const toast = document.getElementById('toast-banner');
        if (toast) {
          toast.style.transform = 'translate(-50%, 1.5rem)';
          toast.style.opacity = '0';
          setTimeout(() => {
            toast.classList.add('hidden');
          }, 300);
        }

        renderTodoList();
        showToast('↩️ Task restored successfully!');
      }
    });
  }

  // 12. Theme Switch Action click
  const darkModeBtn = document.getElementById('dark-mode-btn');
  if (darkModeBtn) {
    darkModeBtn.addEventListener('click', () => {
      isDarkMode = !isDarkMode;
      
      try {
        localStorage.setItem(DARK_MODE_KEY, isDarkMode ? 'true' : 'false');
      } catch (err) {
        console.error('Failed to save theme state:', err);
      }

      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        showToast('☀️ Switched to Dark Theme', false, 2000);
      } else {
        document.documentElement.classList.remove('dark');
        showToast('🌙 Switched to Light Theme', false, 2000);
      }
    });
  }

  // 13. Backup & Recovery drag & drop and manual file selection listeners
  const fileDropZone = document.getElementById('file-drop-zone');
  const backupFileInput = document.getElementById('backup-file-input');
  const exportBackupBtn = document.getElementById('export-backup-btn');

  if (fileDropZone && backupFileInput) {
    // Drag Over visual highlight states
    ['dragenter', 'dragover'].forEach(eventName => {
      fileDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileDropZone.classList.add('drag-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      fileDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileDropZone.classList.remove('drag-active');
      }, false);
    });

    // Detect dropped files
    fileDropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        handleBackupFileLoad(files[0]);
      }
    });

    // Detect click manual selection
    backupFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleBackupFileLoad(e.target.files[0]);
      }
    });
  }

  // Parse, validated and sync imported checklist list
  function handleBackupFileLoad(file) {
    if (!file) return;
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      showToast('❌ Invalid format. Please load a valid JSON file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          const validatedTasks = importedData.map(task => {
            return {
              id: task.id || 'task-' + Math.random().toString(36).substring(2, 11),
              title: typeof task.title === 'string' ? task.title : 'Unnamed task',
              description: typeof task.description === 'string' ? task.description : '',
              completed: !!task.completed,
              priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
              category: typeof task.category === 'string' ? task.category : 'personal',
              dueDate: typeof task.dueDate === 'string' ? task.dueDate : new Date().toISOString().split('T')[0],
              createdAt: typeof task.createdAt === 'number' ? task.createdAt : Date.now()
            };
          });

          const existingIds = new Set(todos.map(t => t.id));
          let importCount = 0;
          validatedTasks.forEach(task => {
            if (!existingIds.has(task.id)) {
              todos.unshift(task);
              importCount++;
            } else {
              const idx = todos.findIndex(t => t.id === task.id);
              if (idx !== -1) {
                todos[idx] = task;
                importCount++;
              }
            }
          });

          saveTodosState();
          renderTodoList();
          showToast(`📥 Successfully imported ${importCount} tasks!`);
        } else {
          showToast('❌ JSON contents must be a list of tasks.');
        }
      } catch (err) {
        console.error('File parsing error:', err);
        showToast('❌ Failed to parse backup. Check JSON formatting.');
      }
      
      if (backupFileInput) backupFileInput.value = '';
    };

    reader.readAsText(file);
  }

  // Backup Export Action trigger
  if (exportBackupBtn) {
    exportBackupBtn.addEventListener('click', () => {
      try {
        const content = JSON.stringify(todos, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const aElement = document.createElement('a');
        aElement.href = url;
        aElement.download = `smart_todo_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(aElement);
        aElement.click();
        
        document.body.removeChild(aElement);
        URL.revokeObjectURL(url);
        showToast('📤 Backup exported successfully!');
      } catch (err) {
        console.error('Failed to export tasks:', err);
        showToast('❌ Export failed. Please try again.');
      }
    });
  }

  // Final initial load
  syncActiveTabsHighlight();
  renderTodoList();
}

// Bind bootstrap on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
