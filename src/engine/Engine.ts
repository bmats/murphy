import * as _ from 'lodash';
import * as fs from 'fs';
const FileQueue = require('filequeue');
import * as moment from 'moment';
import * as path from 'path';
import * as Promise from 'bluebird';
import * as stream from 'stream';
import * as winston from 'winston';
import Archive from './Archive';
import ArchiveVersion from './ArchiveVersion';
import Config from './Config';
import Source from './Source';
import Progress from './Progress';
import {checkPathDoesNotExist, mkdirpAsync, resolveOnOpen, writeFileAsync} from './util';

const fq = new FileQueue(100, true);
const DIRSEP = path.sep;

const SUMMARY_FILE = 'Restore Summary.txt'

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

function matchAnyRegExps(str: string, regexps: RegExp[]) {
  for (let i = 0; i < regexps.length; ++i) {
    if (str.match(regexps[i])) return true;
  }
  return false;
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
    if (!this._callback) return;

    if (message) this._lastMessage = message;
    this._callback(progress, this._lastMessage);
  }

  abort() {
    this._stop = true;
  }

  abstract start(): Promise<any>;
}

class BackupJob extends Job {
  private versions: ArchiveVersion[];
  private newVersion: ArchiveVersion;
  private sourceFiles: string[];

  private _source: Source;
  private _destination: Archive;
  private _config: Config;
  private _progress: Progress;

  constructor(source: Source, destination: Archive, config: Config, callback?: ProgressCallback) {
    super(callback);
    this._source = source;
    this._destination = destination;
    this._config = config;
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

  start(): Promise<ArchiveVersion> {
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
      .then((files: string[]) => {
        this.sourceFiles = files.filter(file => !matchAnyRegExps(file, this._config.fileRegExps));
      })

      .then(this.writeSourceFiles.bind(this))
      .then(this.writeDeletedFiles.bind(this))

      .then(() => { this.updateStatus(this._progress.advance().value, 'Saving new version') })
      .then(() => this.newVersion.apply())
      .then(() => { this.updateStatus(this._progress.advance().value, 'Saving backup') })
      .then(() => this.destination.rebuild())
      .then(() => { this.updateStatus(1, 'Backup complete') })
      .then(() => this.newVersion);
  }

  /**
   * Find which files have been added and modified since the last version and copy them.
   */
  private writeSourceFiles(): Promise<any> {
    this.updateStatus(this._progress.advance().value, 'Looking for files to copy');

    return Promise.map(this.sourceFiles, (file, i) =>
      Promise.each(this.versions, (version: ArchiveVersion) => // sequentially
        version.getFileStatus(file)
          .then(status => {
            switch (status) {
            case 'add':
            case 'modify':
              return Promise.all([this.source.getFileChecksum(file), version.getFileChecksum(file)])
                .then(checksums => {
                  if (checksums[0] !== checksums[1]) {
                    // If file has changed
                    const readStream = this.source.createReadStream(file);
                    return resolveOnOpen(readStream)
                      .then(() => { this.updateStatus(this._progress.current(i / this.sourceFiles.length).value, `Copying "${file}"`) })
                      .then(() => this.newVersion.writeFile(file, 'modify', readStream, checksums[0]))
                      .then(() => { readStream.destroy() })
                      .then(() => Promise.all([Promise.resolve(checksums[0]), this.newVersion.getFileChecksum(file)]))
                      .then(checksums => verifyChecksums(file, checksums))
                  }
                })
                .then(stopPromise); // file was found
            case 'delete':
              let sourceChecksum: string;
              let readStream: stream.Readable;
              return this.source.getFileChecksum(file)
                .then(checksum => { sourceChecksum = checksum })
                .then(() => resolveOnOpen(readStream = this.source.createReadStream(file)))
                .then(() => { this.updateStatus(this._progress.current(i / this.sourceFiles.length).value, `Copying "${file}"`) })
                .then(() => this.newVersion.writeFile(file, 'add', readStream, sourceChecksum))
                .then(() => { readStream.destroy() })
                .then(() => Promise.all([Promise.resolve(sourceChecksum), this.newVersion.getFileChecksum(file)]))
                .then(checksums => verifyChecksums(file, checksums))
                .then(stopPromise); // file was found
            }
          })
      ).then(() => {
        // Not rejected, meaning version was not found, so file is new
        let sourceChecksum: string;
        let readStream: stream.Readable;
        return this.source.getFileChecksum(file)
          .then(checksum => { sourceChecksum = checksum })
          .then(() => resolveOnOpen(readStream = this.source.createReadStream(file)))
          .then(() => { this.updateStatus(this._progress.current(i / this.sourceFiles.length).value, `Copying "${file}"`) })
          .then(() => this.newVersion.writeFile(file, 'add', readStream, sourceChecksum))
          .then(() => { readStream.destroy() })
          .then(() => Promise.all([Promise.resolve(sourceChecksum), this.newVersion.getFileChecksum(file)]))
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
   * Check for files in previous versions that are not in the source, and mark as deleted.
   */
  private writeDeletedFiles(): Promise<any> {
    // If there are no previous versions (just the new version), skip this
    if (this.versions.length < 2)
      return Promise.resolve();

    this.updateStatus(this._progress.advance().value, 'Looking for deleted files');

    const foundFiles: {[file: string]: boolean} = {};
    return Promise.map(this.versions.slice(1), version => // newest version is at [0]
      version.getFiles()
        .then(prevFiles => Promise.map(prevFiles, file =>
          version.getFileStatus(file)
            .then(status => {
              if (!(file in foundFiles)) {
                foundFiles[file] = true;

                if (_.includes(['add', 'modify'], status) && this.sourceFiles.indexOf(file) < 0) {
                  // File not found, so it was deleted
                  return this.newVersion.writeFile(file, 'delete');
                }
              }
            })
        ))
    );
  }
}

class RestoreJob extends Job {
  private versions: ArchiveVersion[];
  private fileVersions: {[file: string]: ArchiveVersion } = {};

  private _source: Archive;
  private _version: ArchiveVersion;
  private _destination: string;
  private _progress: Progress;

  constructor(source: Archive, version: ArchiveVersion, destination: string, callback?: ProgressCallback) {
    super(callback);
    this._source = source;
    this._version = version;
    this._destination = destination;
    this._progress = new Progress({
      getVersions: 0.05,
      mapVersions: 0.15,
      copyFiles:   0.75,
      summary:     0.05
    });
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
    // Get existing archive versions
    this.updateStatus(this._progress.value, 'Reading backup');
    return this.source.getVersions() // newest first
      .then(vers => {
        this.versions = vers;
        if (this.versions.indexOf(this.version) < 0) {
          throw new Error('Specified version not found in archive');
        }
      })

      .then(this.mapVersions.bind(this))
      .then(this.copyFiles.bind(this))

      // Write summary file
      .then(() => { this.updateStatus(this._progress.advance().value, 'Writing restore summary') })
      .then(() => writeFileAsync(this.destination + DIRSEP + SUMMARY_FILE, this._getSummaryText()))
      .then(() => { this.updateStatus(1, 'Restore complete') });
  }

  /**
   * Map files to their latest versions from the specified revision going back.
   */
  private mapVersions(): Promise<any> {
    this.updateStatus(this._progress.advance().value, 'Reading backup versions');

    const startIndex = this.versions.indexOf(this.version);
    return Promise.each(this.versions.slice(startIndex), version => // sequentially
      version.getFiles()
        .then(files => files.forEach(file => {
          if (!this.fileVersions[file]) {
            this.fileVersions[file] = version;
          }
        }))
    );
  }

  /**
   * Check each file status and write added/modified files to the destination.
   * Remove and ignore deleted files.
   */
  private copyFiles(): Promise<any> {
    this.updateStatus(this._progress.advance().value, 'Copying files');

    const files = Object.keys(this.fileVersions);
    return Promise.map(files, (file, i) => {
      const version: ArchiveVersion = this.fileVersions[file];
      return version.getFileStatus(file)
        .then(status => {
          switch (status) {
          case 'add':
          case 'modify':
            const filePath = this.destination + DIRSEP + file;
            return Promise.all([
              mkdirpAsync(path.dirname(filePath)),
              checkPathDoesNotExist(filePath)
                .catch(err => {
                  winston.error('Restore file already exists', { file: filePath });
                  throw new Error(`Restoring file "${file}" would overwrite existing file.`);
                })
            ])
            .then(() => new Promise<void>((resolve, reject) => {
              const readStream = version.createReadStream(file);
              let writeStream: fs.WriteStream;

              readStream.on('error', onError);
              readStream.on('open', () => {
                writeStream = fq.createWriteStream(filePath);
                writeStream.on('error', onError);

                writeStream.on('open', () => {
                  this.updateStatus(this._progress.current(i / files.length).value, `Copying "${file}"`);
                  readStream.pipe(writeStream);
                });
                writeStream.once('finish', () => {
                  readStream.destroy();
                  writeStream.close();
                  resolve();
                });
              });

              function onError(err) {
                winston.error('Error writing file', { path: filePath, error: err });
                readStream.destroy();
                if (writeStream)
                  writeStream.close();
                reject(err);
              }
            }));
          case 'delete':
          default:
            // Ignore this file
            delete this.fileVersions[file];
            return Promise.resolve();
          }
        })
    });
  }

  private _getSummaryText() {
    const time: string = moment().format('dddd, MMMM D, YYYY [at] h:mm:ss A');
    const versionDate: string = moment(this.version.date).format('dddd, MMMM D, YYYY [at] h:mm:ss A');

    return `Restored backup "${this.source.name}" from ${versionDate}.\r\n` +
        `Completed on ${time}.\r\n\r\n` +
        'Restored files (file backup date):\r\n' +
      Object.keys(this.fileVersions).map(file => {
        const fileVersionDate = moment(this.fileVersions[file].date).format('YYYY-MM-DD HH:mm:ss');
        return `${file}\t(${fileVersionDate})\r\n`;
      }).join('');
  }
}

// TODO: implement job stopping?
export default class Engine {
  private _jobCount: number = 0;
  private _config: Config;

  constructor(config: Config) {
    this._config = config;
  }

  runBackup(source: Source, destination: Archive, progressCallback?: ProgressCallback): Promise<ArchiveVersion> {
    if (this._jobCount > 0)
      throw new Error('Cannot run more than one job at a time.');
    ++this._jobCount;

    const job = new BackupJob(source, destination, this._config, progressCallback);
    return job.start()
      .then(version => {
        --this._jobCount;
        return version;
      }, err => {
        --this._jobCount;
        throw err;
      });
  }

  runRestore(source: Archive, version: ArchiveVersion, destination: string, progressCallback?: ProgressCallback): Promise<void> {
    if (this._jobCount > 0)
      throw new Error('Cannot run more than one job at a time.');
    ++this._jobCount;

    const job = new RestoreJob(source, version, destination, progressCallback);
    return job.start()
      .then(() => { --this._jobCount }, err => {
        --this._jobCount;
        throw err;
      });
  }
}
