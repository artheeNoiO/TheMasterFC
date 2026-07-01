/** Claude artifact storage API → localStorage for browser/Vite */
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      return value != null ? { value } : null;
    },
    async set(key, value) {
      localStorage.setItem(key, value);
    },
    async delete(key) {
      localStorage.removeItem(key);
    },
  };
}
