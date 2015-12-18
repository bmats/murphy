import { EventEmitter } from 'events';
import Config from './engine/Config';
import Engine from './engine/Engine';
import Source from './engine/Source';
import FilesystemArchive from './engine/fs/FilesystemArchive';

interface Sendable {
  send(channel: string, arg)
}

export default class BackupConnector {
  private _ipcOut: Sendable;
  private _engine: Engine;
  private _config: Config;
  // private _configLoadCallbacks = [];

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

  onLoadConfig(event, arg): void {
    if (this._config) {
      this._ipcOut.send('config-loaded', BackupConnector._serializeConfig(this._config));
    } else {
      Config.load()
        .then(config => {
          this._config = config;
          // this._configLoadCallbacks.forEach(callback => callback());
          this._ipcOut.send('config-loaded', BackupConnector._serializeConfig(config));
        });
    }
  }

  onStartBackup(event, arg): void {
    this._engine.runBackup(arg.source, arg.destination, this.onBackupProgress)
      .then(() => { this._ipcOut.send('backup-complete', null) })
      .catch((err) => { this._ipcOut.send('backup-error', err) });
  }

  private onBackupProgress(progress: number, message: string) {
    this._ipcOut.send('backup-progress', {
      progress: progress,
      message: message
    });
  }

  onStartRestore(event, arg): void {
    this._engine.runRestore(arg.source, arg.version, arg.destination, this.onRestoreProgress)
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
    this.onLoadConfig(event, null); // reload
  }

  onAddArchive(event, arg): void {
    this._config.addArchive(new FilesystemArchive(arg.name, arg.path));
    this.onLoadConfig(event, null); // reload
  }

  onRequestSources(event, arg): void {
    // if (this._config)
      this._ipcOut.send('response-sources', this._config.sources);
    // else
    //   this._configLoadCallbacks.push(this.onRequestSources);
  }

  onRequestArchives(event, arg): void {
    // if (this._config)
      this._ipcOut.send('response-archives', this._config.archives);
    // else
    //   this._configLoadCallbacks.push(this.onRequestArchives);
  }

  private static _serializeConfig(config: Config): any {
    return {
      sources: config.sources.map(s => {
        return {
          name: s.name
        };
      }),
      archives: config.archives.map(a => {
        return {
          name: a.name
        };
      })
    };
  }
}
