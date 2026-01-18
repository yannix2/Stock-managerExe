const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getApiUrl: () => {
    if (process.env.API_URL) return process.env.API_URL; // packaged
    return 'https://stockmanager.up.railway.app/api'; // dev
  },
});
