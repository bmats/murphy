import {app, BrowserWindow, ipcMain, Menu} from 'electron';
import * as os from 'os';
import {sep as DIRSEP} from 'path';
import * as winston from 'winston';
import BackupConnector from './BackupConnector';

if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';
const DEBUG = (process.env.NODE_ENV === 'development');

// Log to file
winston.add(winston.transports.File, {
  filename: (DEBUG ? '.' : os.tmpdir()) + DIRSEP + 'murphy.log',
  level: DEBUG ? 'debug': 'info'
});

// electron.crashReporter.start();

// Keep a global reference of the window object
let mainWindow: GitHubElectron.BrowserWindow;
let connector: BackupConnector;

// Quit when all windows are closed.
app.on('window-all-closed', () => app.quit());

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 650,
    minHeight: 350,
    title: app.getName(),
    autoHideMenuBar: true
  });
  winston.info('Created BrowserWindow');

  Menu.setApplicationMenu(Menu.buildFromTemplate(require('./menu')));

  connector = new BackupConnector(ipcMain, mainWindow);

  mainWindow.loadURL(`file://${__dirname}/../static/index.html`);

  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});
