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
  private _ipcOut: Sendable;
  private _engine: Engine;
  private _config: Config;

  constructor(ipcIn: EventEmitter, ipcOut: Sendable) {
    ipcIn.on('load-config', this.onLoadConfig.bind(this));
    ipcIn.on('start-backup', this.onStartBackup.bind(this));
    ipcIn.on('start-restore', this.onStartRestore.bind(this));
    ipcIn.on('add-source', this.onAddSource.bind(this));
    ipcIn.on('add-archive', this.onAddArchive.bind(this));
    ipcIn.on('request-sources', this.onRequestSources.bind(this));
    ipcIn.on('request-archives', this.onRequestArchives.bind(this));
    this._ipcOut = ipcOut;

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
      this._ipcOut.send('backup-error', 'Backup source or archive mismatch.');
      return;
    }

    this._engine.runBackup(source, dest, this.onBackupProgress.bind(this))
      .then(() => {
        winston.info('Backup complete');
        this._ipcOut.send('backup-complete', null);
      })
      .catch(err => {
        winston.error('Backup error', { error: err });
        this._ipcOut.send('backup-error', err);
      });
  }

  private onBackupProgress(progress: number, message: string) {
    winston.debug('Backup progress', { progress: progress, progressMessage: message });
    this._ipcOut.send('backup-progress', {
      progress: progress,
      message: message
    });
  }

  onStartRestore(event, arg): void {
    this._engine.runRestore(arg.source, arg.version, arg.destination, this.onRestoreProgress.bind(this))
      .then(() => { this._ipcOut.send('restore-complete', null) })
      .catch((err) => { this._ipcOut.send('restore-error', err) });
  }

  private onRestoreProgress(progress: number, message: string) {
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

  onRequestSources(event, arg): void {
    this._ipcOut.send('response-sources', this._config.sources);
  }

  onRequestArchives(event, arg): void {
    this._ipcOut.send('response-archives', this._config.archives);
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
