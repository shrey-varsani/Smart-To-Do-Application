/* ==========================================================================
   TaskManager State Engine & Operations
   ========================================================================== */

import { getStorageItem, setStorageItem, STORAGE_KEY } from './storage.js';

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

let todos = [];
let recentlyDeletedTodo = null;
let recentlyDeletedIndex = -1;

export function stripEmojis(text) {
  if (!text) return '';
  let cleaned = '';
  try {
    cleaned = text.replace(/\p{Extended_Pictographic}/gu, '');
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F0F5}\u{1F004}\u{1F191}-\u{1F251}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2190}-\u{21FF}]/gu, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
  } catch (e) {
    cleaned = text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
                  .replace(/\s+/g, ' ').trim();
  }
  return cleaned || 'Task';
}

export function loadTodosState() {
  try {
    const rawTodos = getStorageItem(STORAGE_KEY);
    if (!rawTodos) {
      todos = [...DEFAULT_TODOS];
      setStorageItem(STORAGE_KEY, JSON.stringify(todos));
    } else {
      todos = JSON.parse(rawTodos);
    }
    todos.forEach(todo => {
      todo.title = stripEmojis(todo.title);
    });
  } catch (error) {
    console.error('Failed to parse saved tasks storage. Resetting...', error);
    todos = [...DEFAULT_TODOS];
  }
  return todos;
}

export function saveTodosState() {
  setStorageItem(STORAGE_KEY, JSON.stringify(todos));
}

export function getTodos() {
  return todos;
}

export function setTodos(newTodos) {
  todos = newTodos;
  saveTodosState();
}

export function addTodo(title, description, priority, category, dueDate) {
  const newTask = {
    id: 'task-' + Math.random().toString(36).substring(2, 11),
    title: stripEmojis(title),
    description: description || '',
    completed: false,
    priority: priority || 'medium',
    category: category || 'personal',
    dueDate: dueDate || new Date().toISOString().split('T')[0],
    createdAt: Date.now()
  };
  todos.unshift(newTask);
  saveTodosState();
  return newTask;
}

export function updateTodo(id, updatedFields) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    if (updatedFields.title !== undefined) {
      updatedFields.title = stripEmojis(updatedFields.title);
    }
    todos[index] = { ...todos[index], ...updatedFields };
    saveTodosState();
    return todos[index];
  }
  return null;
}

export function toggleTodoCompleted(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodosState();
    return todo;
  }
  return null;
}

export function deleteTodo(id) {
  const absoluteIndex = todos.findIndex(t => t.id === id);
  if (absoluteIndex !== -1) {
    recentlyDeletedTodo = todos[absoluteIndex];
    recentlyDeletedIndex = absoluteIndex;
    todos.splice(absoluteIndex, 1);
    saveTodosState();
    return recentlyDeletedTodo;
  }
  return null;
}

export function undoDeleteTodo() {
  if (recentlyDeletedTodo && recentlyDeletedIndex !== -1) {
    todos.splice(recentlyDeletedIndex, 0, recentlyDeletedTodo);
    saveTodosState();
    const restored = recentlyDeletedTodo;
    recentlyDeletedTodo = null;
    recentlyDeletedIndex = -1;
    return restored;
  }
  return null;
}

export function clearCompletedTodos() {
  const completedCount = todos.filter(t => t.completed).length;
  if (completedCount > 0) {
    todos = todos.filter(t => !t.completed);
    saveTodosState();
  }
  return completedCount;
}

export function reorderTodos(draggedId, targetId) {
  const draggedIndex = todos.findIndex(t => t.id === draggedId);
  const targetIndex = todos.findIndex(t => t.id === targetId);
  if (draggedIndex !== -1 && targetIndex !== -1) {
    const [movedTask] = todos.splice(draggedIndex, 1);
    todos.splice(targetIndex, 0, movedTask);
    saveTodosState();
    return true;
  }
  return false;
}
