
  //  LocalStorage Persistence Utilities


export const STORAGE_KEY = 'smart_todo_app_data';
export const DARK_MODE_KEY = 'smart_todo_dark_mode';

export function getStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`Failed to read from localStorage key: ${key}`, e);
    return null;
  }
}

export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Failed to save to localStorage key: ${key}`, e);
  }
}
