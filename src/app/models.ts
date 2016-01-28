import * as events from 'events';
import {ipcRenderer} from 'electron';

export class Engine extends events.EventEmitter {
  private _config: Config;
  private _backupJob: BackupJob;
  private _restoreJob: RestoreJob;

  private _addedSourceName: string = null;
  private _addedArchiveName: string = null;

  constructor() {
    super();
    this._config = new Config();
    this._backupJob = new BackupJob();
    this._restoreJob = new RestoreJob();
    this._backupJob.on('change', this.emit.bind(this, 'change'));
    this._restoreJob.on('change', this.emit.bind(this, 'change'));

    ipcRenderer.on('configLoaded', (event, arg) => {
      this._config.loadIPC(arg);

      // If a source/archive was just added, emit an event now that it is in the config
      if (this._addedSourceName) {
        const newSource = this._config.sources.find(s => s.name === this._addedSourceName);
        this.emit('sourceAdded', newSource);
        this._addedSourceName = null;
      }
      if (this._addedArchiveName) {
        const newArchive = this._config.archives.find(a => a.name === this._addedArchiveName);
        this.emit('archiveAdded', newArchive);
        this._addedArchiveName = null;
      }

      this.emit('change');
    });

    ipcRenderer.on('archiveVersions', (event, arg: { archive: Archive; versions: ArchiveVersion[] }) => {
      this.emit('archiveVersions', arg.archive, arg.versions);
    });
  }

  connect() {
    // Get the config to start things rolling
    ipcRenderer.send('loadConfig');
  }

  get config(): Config {
    return this._config;
  }

  get backupJob(): BackupJob {
    return this._backupJob;
  }

  get restoreJob(): RestoreJob {
    return this._restoreJob;
  }

  addSource(name: string, paths: string[]) {
    ipcRenderer.send('addSource', {
      name: name,
      paths: paths
    });
    this._addedSourceName = name;
  }

  addArchive(name: string, path: string) {
    ipcRenderer.send('addArchive', {
      name: name,
      path: path
    });
    this._addedArchiveName = name;
  }

  requestArchiveVersions(archive: Archive) {
    ipcRenderer.send('requestArchiveVersions', archive);
  }

  openArchive(archive: Archive) {
    ipcRenderer.send('openArchive', archive);
  }
}

// Mirror of BackupConnector SerializedConfig
class Config {
  private _sources: Source[];
  private _archives: Archive[];
  private _fileRegExps: string[];
  private _ui: UIConfig;

  get sources(): Source[] {
    return this._sources;
  }

  get archives(): Archive[] {
    return this._archives;
  }

  get fileRegExps(): string[] {
    return this._fileRegExps;
  }

  get ui(): UIConfig {
    return this._ui;
  }

  set fileRegExps(fileRegExps: string[]) {
    this._fileRegExps = fileRegExps;
    this.save();
  }

  set ui(ui: UIConfig) {
    this._ui = ui;
    this.save();
  }

  loadIPC(data: any) {
    this._sources = data.sources;
    this._archives = data.archives;
    this._fileRegExps = data.fileRegExps;
    this._ui = data.ui;
  }

  private save() {
    ipcRenderer.send('updateConfig', {
      fileRegExps: this.fileRegExps,
      ui: this.ui
    });
  }
}

class Job extends events.EventEmitter {
  private _isRunning: boolean = false;
  private _hasRun: boolean = false;
  private _hasError: boolean = false;
  private _progress: number = 0;
  private _progressMessage: string = null;
  private _result: any = {};

  constructor(type: string) {
    super();

    ipcRenderer.on(`${type}Progress`, (event, arg) => {
      if (this.hasError) return;
      this._progress = arg.progress;
      this._progressMessage = arg.message;
      this.emit('change');
    });
    ipcRenderer.on(`${type}Complete`, (event, arg) => {
      this.isRunning = false;
      this._result = arg.result || {};
      this.emit('change');
    });
    ipcRenderer.on(`${type}Error`, (event, arg) => {
      this.isRunning = false;
      this._hasError = true;
      this._progressMessage = arg;
      this.emit('change');
      this.emit('error', new Error(arg));
    });
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  set isRunning(isRunning: boolean) {
    this._isRunning = isRunning;
    if (isRunning) {
      this._hasRun = true;
      this._hasError = false;
      this._progress = 0;
      this._progressMessage = null;
      this._result = {};
    }
  }

  get hasRun(): boolean {
    return this._hasRun;
  }

  get hasError(): boolean {
    return this._hasError;
  }

  get progress(): number {
    return this._progress;
  }

  get progressMessage(): string {
    return this._progressMessage;
  }

  get result(): any {
    return this._result;
  }
}

class BackupJob extends Job {
  constructor() {
    super('backup');
  }

  start(source: Source, destination: Archive) {
    this.isRunning = true;
    ipcRenderer.send('startBackup', {
      source: source,
      destination: destination
    });

    this.emit('change');
  }
}

class RestoreJob extends Job {
  constructor() {
    super('restore');
  }

  start(source: Archive, version: ArchiveVersion, destination: string) {
    this.isRunning = true;
    ipcRenderer.send('startRestore', {
      source: source,
      version: { date: version.date.valueOf() }, // serialize
      destination: destination
    });

    this.emit('change');
  }
}

interface UIConfig {
  isRegExpEnabled?: boolean;
}

export interface Source {
  name: string;
}

export interface Archive {
  name: string;
}

export interface ArchiveVersion {
  date: Date;
}
