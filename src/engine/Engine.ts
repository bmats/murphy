import * as Promise from 'bluebird';
import * as winston from 'winston';
import Archive from './Archive';
import ArchiveVersion from './ArchiveVersion';
import Progress from './Progress';
import Source from './Source';

interface ProgressCallback {
  (progress: number, message: string): any
}

function verifyChecksums(file: string, checksums: string[]): Promise<void> {
  return Promise.resolve(checksums[0] !== checksums[1])
    ? Promise.resolve()
    : Promise.reject(new Error(`Mismatching checksums for "${file}": ${checksums[0]} vs. ${checksums[1]}`));
}

// Throw this to stop a promise chain
class StopPromiseError extends Error {
}

function stopPromise(): StopPromiseError {
  throw new StopPromiseError();
}

abstract class Job {
  private _callback: ProgressCallback;
  private _stop: boolean;
  private _lastMessage: string = '';

  constructor(callback?: ProgressCallback) {
    this._callback = callback;
  }

  get stop(): boolean {
    return this._stop;
  }

  updateStatus(progress: number, message?: string): void {
    if (message) this._lastMessage = message;

    if (this._callback)
      this._callback(progress, this._lastMessage);
  }

  abort() {
    this._stop = true;
  }

  abstract start(): Promise<void>;
}

class BackupJob extends Job {
  versions: ArchiveVersion[];
  newVersion: ArchiveVersion;
  sourceFiles: string[];

  private _source: Source;
  private _destination: Archive;
  private _progress: Progress;

  constructor(source: Source, destination: Archive, callback?: ProgressCallback) {
    super(callback);
    this._source = source;
    this._destination = destination;
    this._progress = new Progress({
      getVersions:       0.08,
      createVersion:     0.02,
      getSourceFiles:    0.1,
      writeSourceFiles:  0.4,
      writeDeletedFiles: 0.3,
      apply:             0.02,
      rebuild:           0.08
    });
  }

  get source(): Source {
    return this._source;
  }

  get destination(): Archive {
    return this._destination;
  }

  start(): Promise<void> {
    // Get existing archive versions
    this.updateStatus(this._progress.value, 'Reading backup');
    return this.destination.getVersions() // newest first
      .then(vers => { this.versions = vers })

      // Make a new version
      .then(() => { this.updateStatus(this._progress.advance().value, 'Creating new version') })
      .then(this.destination.createVersion.bind(this.destination))
      .then((newVer: ArchiveVersion) => { this.newVersion = newVer })

      // Get the source files
      .then(() => { this.updateStatus(this._progress.advance().value, 'Reading source folder(s)') })
      .then(this.source.getFiles.bind(this.source))
      .then((files: string[]) => { this.sourceFiles = files })

      .then(this.writeSourceFiles.bind(this))
      .then(this.writeDeletedFiles.bind(this))

      .then(() => { this.updateStatus(this._progress.advance().value, 'Saving new version') })
      .then(() => this.newVersion.apply())
      .then(() => { this.updateStatus(this._progress.advance().value, 'Saving backup') })
      .then(() => this.destination.rebuild())
      .then(() => { this.updateStatus(1, 'Done') });
  }

  /**
   * Find which files have been added and modified since the last version and copy them.
   */
  private writeSourceFiles(): Promise<any> {
    this.updateStatus(this._progress.advance().value, 'Copying files');

    return Promise.map(this.sourceFiles, (file, i) =>
      Promise.each(this.versions, (version: ArchiveVersion) => // sequentially
        version.getFileStatus(file)
          .then(status => {
            this.updateStatus(this._progress.current(i / this.sourceFiles.length).value);

            switch (status) {
            case 'add':
            case 'modify':
              return Promise.all([this.source.getFileChecksum(file), version.getFileChecksum(file)])
                .then(checksums => {
                  if (checksums[0] !== checksums[1]) {
                    // If file has changed
                    return this.newVersion.writeFile(file, 'modify', this.source.createReadStream(file))
                      .then(() => Promise.all([Promise.resolve(checksums[0]), this.newVersion.getFileChecksum(file)]))
                      .then(checksums => verifyChecksums(file, checksums))
                  }
                })
                .then(stopPromise); // file was found
            case 'delete':
              return this.newVersion.writeFile(file, 'add', this.source.createReadStream(file))
                .then(() => Promise.all([this.source.getFileChecksum(file), this.newVersion.getFileChecksum(file)]))
                .then(checksums => verifyChecksums(file, checksums))
                .then(stopPromise); // file was found
            }
          })
      ).then(() => {
        // Not rejected, meaning version was not found, so file is new
        return this.newVersion.writeFile(file, 'add', this.source.createReadStream(file))
          .then(() => Promise.all([this.source.getFileChecksum(file), this.newVersion.getFileChecksum(file)]))
          .then(checksums => verifyChecksums(file, checksums));
      }, (err) => {
        if (err instanceof StopPromiseError) {
          // Rejected above, meaning version was found, so this is OK
          // Keep calm and carry on
        } else {
          winston.error('Error copying modified files', { error: err });
          return Promise.reject(err);
        }
      })
    );
  }

  /**
   * Check for files in previous version that are not in the source, and mark as deleted.
   */
  private writeDeletedFiles(): Promise<any> {
    // If there are no previous versions (just the new version), skip this
    if (this.versions.length < 2)
      return Promise.resolve();

    this.updateStatus(this._progress.advance().value, 'Looking for deleted files');

    return this.versions[1].getFiles() // new version is at [0]
      .then(prevFiles => Promise.map(prevFiles, file => {
        if (this.sourceFiles.indexOf(file) < 0) {
          // File not found, so it was deleted
          return this.newVersion.writeFile(file, 'delete');
        }
      }));
  }
}

class RestoreJob extends Job {
  private _source: Archive;
  private _version: ArchiveVersion;
  private _destination: string;

  constructor(source: Archive, version: ArchiveVersion, destination: string, callback?: ProgressCallback) {
    super(callback);
    this._source = source;
    this._version = version;
    this._destination = destination;
  }

  get source(): Archive {
    return this._source;
  }

  get version(): ArchiveVersion {
    return this._version;
  }

  get destination(): string {
    return this._destination;
  }

  start(): Promise<void> {
    // TODO: implement
    return null;
  }
}

// TODO: implement job stopping?
export default class Engine {
  private _jobCount: number = 0;

  constructor() {
  }

  runBackup(source: Source, destination: Archive, progressCallback?: ProgressCallback): Promise<void> {
    if (this._jobCount > 0)
      throw new Error('Cannot run more than one job at a time.');
    ++this._jobCount;

    const job = new BackupJob(source, destination, progressCallback);
    return job.start()
      .then(() => { --this._jobCount });
  }

  runRestore(source: Archive, version: ArchiveVersion, destination: string, progressCallback?: ProgressCallback): Promise<void> {
    if (this._jobCount > 0)
      throw new Error('Cannot run more than one job at a time.');
    ++this._jobCount;

    const job = new RestoreJob(source, version, destination, progressCallback);
    return job.start()
      .then(() => { --this._jobCount });
  }
}
