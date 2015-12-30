import { dialog, shell } from 'electron';
import { EventEmitter } from 'events';
import * as winston from 'winston';
import Config from './engine/Config';
import Engine from './engine/Engine';
import Source from './engine/Source';
import FilesystemArchive from './engine/fs/FilesystemArchive';
import {Source as AppSource, Archive as AppArchive} from './app/models';

interface Sendable {
  send(channel: string, arg)
}

interface SerializedConfig {
  sources: AppSource[];
  archives: AppArchive[];
}

export default class BackupConnector {
  private _window: GitHubElectron.BrowserWindow;
  private _ipcOut: Sendable;
  private _engine: Engine;
  private _config: Config;

  constructor(ipcIn: EventEmitter, browserWindow: GitHubElectron.BrowserWindow) {
    ipcIn.on('load-config', this.onLoadConfig.bind(this));
    ipcIn.on('start-backup', this.onStartBackup.bind(this));
    ipcIn.on('start-restore', this.onStartRestore.bind(this));
    ipcIn.on('add-source', this.onAddSource.bind(this));
    ipcIn.on('add-archive', this.onAddArchive.bind(this));
    ipcIn.on('get-archive-versions', this.onRequestArchiveVersions.bind(this));
    ipcIn.on('open-archive', this.onOpenArchive.bind(this));
    this._window = browserWindow;
    this._ipcOut = browserWindow.webContents;

    this._engine = new Engine();
  }

  onLoadConfig(): void {
    if (this._config) {
      this._ipcOut.send('config-loaded', this._serializeConfig());
    } else {
      Config.load()
        .then(config => {
          this._config = config;
          this._ipcOut.send('config-loaded', this._serializeConfig());
        });
    }
  }

  onStartBackup(event, arg: {source: AppSource, destination: AppArchive}): void {
    const source = this._config.sources.find(s => s.name === arg.source.name);
    const dest   = this._config.archives.find(a => a.name === arg.destination.name);

    if (!source || !dest) {
      winston.error('Backup source or archive mismatch', { sourceName: arg.source.name, archiveName: arg.destination.name });
      this._ipcOut.send('backup-error', new Error('Source or archive mismatch.'));
      return;
    }

    this._engine.runBackup(source, dest, this.onBackupProgress.bind(this))
      .then(version => version.getFiles())
      .then(files => {
        winston.info('Backup complete');
        this._ipcOut.send('backup-complete', {
          stats: {
            count: files.length
          }
        });
        this.onLoadConfig(); // reload archives
      })
      .catch(err => {
        winston.error('Backup error', { error: err });
        this._ipcOut.send('backup-error', err.toString());
      })
      .then(() => { this._window.setProgressBar(-1) }); // remove
  }

  private onBackupProgress(progress: number, message: string) {
    winston.debug('Backup progress', { progress: progress, progressMessage: message });
    this._window.setProgressBar(progress);
    this._ipcOut.send('backup-progress', {
      progress: progress,
      message: message
    });
  }

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
        this._ipcOut.send('restore-complete', null);
      })
      .catch((err) => {
        winston.error('Restore error', { error: err });
        this._ipcOut.send('restore-error', err.toString());
      })
      .then(() => { this._window.setProgressBar(-1) }); // remove
  }

  private onRestoreProgress(progress: number, message: string) {
    winston.debug('Restore progress', { progress: progress, progressMessage: message });
    this._window.setProgressBar(progress);
    this._ipcOut.send('restore-progress', {
      progress: progress,
      message: message
    });
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
      .then(ver => this._ipcOut.send('archive-versions', {
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
      })
    };
  }
}
