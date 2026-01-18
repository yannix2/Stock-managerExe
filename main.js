const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'frontend','dist', 'index.html'));
  mainWindow.webContents.openDevTools();
  
  setTimeout(startBackend, 1500);
}

function startBackend() {
  // Use bundled node.exe for packaged app
  const nodePath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, 'node.exe')
    : 'node';
    
  const backendPath = path.join(__dirname, 'backend', 'server.cjs');
  
  console.log('🚀 Node:', nodePath);
  console.log('🚀 Backend:', backendPath);
  
  if (!fs.existsSync(backendPath)) {
    console.error('❌ server.cjs NOT FOUND');
    return;
  }

  backendProcess = spawn(nodePath, [backendPath], {
    stdio: 'inherit',
    cwd: path.dirname(backendPath),
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      API_URL: 'http://127.0.0.1:3000/api'
    }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[BACKEND]: ${data}`);
  });
  
  backendProcess.stderr.on('data', (data) => {
    console.error(`[BACKEND ERROR]: ${data}`);
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
