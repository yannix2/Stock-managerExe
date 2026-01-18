const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getApiUrl: () => {
    if (process.env.API_URL) return process.env.API_URL; // packaged
    return 'http://127.0.0.1:3000/api'; // dev
  },
});
