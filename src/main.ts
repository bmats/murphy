import {app, BrowserWindow, ipcMain} from 'electron';
import * as winston from 'winston';
import BackupConnector from './BackupConnector';

winston.add(winston.transports.File, { filename: 'murphy.log', level: 'debug' });

// electron.crashReporter.start();

// Keep a global reference of the window object
let mainWindow;
let connector;

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  // Create the browser window
  mainWindow = new BrowserWindow({ width: 800, height: 600, minWidth: 660, minHeight: 495, title: 'Murphy' });
  winston.info('Created BrowserWindow');

  connector = new BackupConnector(ipcMain, mainWindow.webContents);

  mainWindow.loadURL(`file://${__dirname}/../static/index.html`);

  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});
