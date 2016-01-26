import { dialog, shell } from 'electron';
import * as _ from 'lodash';
import { EventEmitter } from 'events';
import * as winston from 'winston';
import Config from './engine/Config';
import Engine from './engine/Engine';
import Source from './engine/Source';
import ArchiveVersion from './engine/ArchiveVersion';
import FilesystemArchive from './engine/fs/FilesystemArchive';
import {Source as AppSource, Archive as AppArchive} from './app/models';

interface Sendable {
  send(channel: string, arg)
}

interface SerializedConfig {
  sources: AppSource[];
  archives: AppArchive[];
  fileRegExps: string[];
  ui: {};
}

interface ConfigUpdate {
  fileRegExps: string[];
  ui: {};
}

const UI_UPDATE_RATE = 300; // ms

export default class BackupConnector {
  private _window: GitHubElectron.BrowserWindow;
  private _ipcOut: Sendable;
  private _engine: Engine;
  private _config: Config;

  constructor(ipcIn: EventEmitter, browserWindow: GitHubElectron.BrowserWindow) {
    ipcIn.on('loadConfig', this.onLoadConfig.bind(this));
    ipcIn.on('startBackup', this.onStartBackup.bind(this));
    ipcIn.on('startRestore', this.onStartRestore.bind(this));
    ipcIn.on('addSource', this.onAddSource.bind(this));
    ipcIn.on('addArchive', this.onAddArchive.bind(this));
    ipcIn.on('requestArchiveVersions', this.onRequestArchiveVersions.bind(this));
    ipcIn.on('openArchive', this.onOpenArchive.bind(this));
    ipcIn.on('updateConfig', this.onUpdateConfig.bind(this));
    this._window = browserWindow;
    this._ipcOut = browserWindow.webContents;
  }

  onLoadConfig(): void {
    if (this._config) {
      this._ipcOut.send('configLoaded', this._serializeConfig());
    } else {
      Config.load()
        .then(config => {
          this._config = config;
          this._engine = new Engine(config);
          this._ipcOut.send('configLoaded', this._serializeConfig());
        });
    }
  }

  onStartBackup(event, arg: {source: AppSource, destination: AppArchive}): void {
    const source = this._config.sources.find(s => s.name === arg.source.name);
    const dest   = this._config.archives.find(a => a.name === arg.destination.name);

    if (!source || !dest) {
      winston.error('Backup source or archive mismatch', { sourceName: arg.source.name, archiveName: arg.destination.name });
      this._ipcOut.send('backupError', new Error('Source or archive mismatch.'));
      return;
    }

    this._engine.runBackup(source, dest, this.onBackupProgress.bind(this))
      .then(version => version.getFiles())
      .then(files => {
        winston.info('Backup complete');
        this._ipcOut.send('backupComplete', {
          result: {
            count: files.length
          }
        });
        this.onLoadConfig(); // reload archives
      })
      .catch(err => {
        winston.error('Backup error', { error: err });
        this._ipcOut.send('backupError', err.toString());
      })
      .then(() => { this._window.setProgressBar(-1) }); // remove
  }

  private onBackupProgress(progress: number, message: string) {
    winston.debug('Backup progress', { progress: progress, progressMessage: message });
    this._updateUIProgress('backup', progress, message);
  }

  private _updateUIProgress = _.throttle((type: string, progress: number, message: string) => {
    this._window.setProgressBar(progress);
    this._ipcOut.send(`${type}Progress`, {
      progress: progress,
      message: message
    });
  }, UI_UPDATE_RATE);

  onStartRestore(event, arg): void {
    const source = this._config.archives.find(a => a.name === arg.source.name);

    // Find the correct archive version
    arg.version.date = new Date(arg.version.date); // unserialize
    let version;
    source.getVersions()
      .then(versions => {
        version = versions.find(v => v.date.valueOf() === arg.version.date.valueOf());
        if (!source || !version) {
          winston.error('Restore archive or archive version mismatch', { archiveName: arg.source.name, versionDate: arg.version.date });
          throw new Error('Archive or archive version mismatch.');
        }
      })

      // Run the restore
      .then(() => this._engine.runRestore(source, version, arg.destination, this.onRestoreProgress.bind(this)))
      .then(() => {
        winston.info('Restore complete');
        this._ipcOut.send('restoreComplete', {});
      })
      .catch((err) => {
        winston.error('Restore error', { error: err });
        this._ipcOut.send('restoreError', err.toString());
      })
      .then(() => { this._window.setProgressBar(-1) }); // remove
  }

  private onRestoreProgress(progress: number, message: string) {
    winston.debug('Restore progress', { progress: progress, progressMessage: message });
    this._updateUIProgress('restore', progress, message);
  }

  onAddSource(event, arg): void {
    this._config.addSource(new Source(arg.name, arg.paths));
    this.onLoadConfig(); // reload
  }

  onAddArchive(event, arg): void {
    const archive = new FilesystemArchive(arg.name, arg.path);
    archive.init()
      .then(() => {
        this._config.addArchive(archive);
        this.onLoadConfig(); // reload
      })
      .catch(err => {
        winston.error('Error adding archive', { error: err });
      });
  }

  onRequestArchiveVersions(event, appArchive): void {
    if (!appArchive) return;

    const archive = this._config.archives.find(a => a.name === appArchive.name);
    if (!archive) {
      winston.error('Error mapping app archive to archive', { appArchive: appArchive, archives: this._config.archives });
      return;
    }

    archive.getVersions()
      .then(ver => this._ipcOut.send('archiveVersions', {
        archive: appArchive,
        versions: ver.map(v => {
          return {
            date: v.date.valueOf() // serialize
          };
        })
      }));
  }

  onOpenArchive(event, appArchive): void {
    const archive = this._config.archives.find(a => a.name === appArchive.name);
    if (!archive) {
      winston.error('Error mapping app archive to archive', { appArchive: appArchive, archives: this._config.archives });
      dialog.showMessageBox({
        type: 'error',
        buttons: ['OK'],
        message: 'Error finding archive.'
      });
      return;
    }

    if (archive instanceof FilesystemArchive) {
      shell.openItem(archive.path);
    } else {
      winston.warn('Unknown archive type', { archive: archive });
      dialog.showMessageBox({
        type: 'error',
        buttons: ['OK'],
        message: 'Unknown archive type.'
      });
    }
  }

  onUpdateConfig(event, update: ConfigUpdate): void {
    this._config.fileRegExps = update.fileRegExps.map(pattern => new RegExp(pattern));
    this._config.ui = update.ui;
    this.onLoadConfig(); // reload
  }

  private _serializeConfig(): SerializedConfig {
    return {
      sources: this._config.sources.map(s => {
        return {
          name: s.name
        };
      }),
      archives: this._config.archives.map(a => {
        return {
          name: a.name
        };
      }),
      fileRegExps: this._config.fileRegExps.map(r => r.source),
      ui: this._config.ui
    };
  }
}
