import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import {sep as DIRSEP} from 'path';
import * as winston from 'winston';
import * as yaml from 'js-yaml';
import ArchiveVersion from '../ArchiveVersion';
import {checkPathDoesNotExist, hashStream, mkdirPromise, mkdirpPromise, readFilePromise, writeFilePromise} from '../util';

const FOLDER_NAME_REGEX = /(\d{4})-(\d{2})-(\d{2}) (\d{2})-(\d{2})-(\d{2})/;
const VERSIONS_FOLDER: string = 'Versions';
const INDEX_FILE: string = '.index';

interface FileIndex {
  [file: string]: string;
}

export default class FilesystemArchiveVersion extends ArchiveVersion {
  private _archivePath: string;
  private _folderName: string;
  private _source: string;
  private _index: FileIndex;

  constructor(date: Date, archivePath: string) {
    super(date);
    this._archivePath = archivePath;
    this._folderName = FilesystemArchiveVersion.formatDate(date);
  }

  get folderName(): string {
    return this._folderName;
  }

  get source(): string {
    return this._source;
  }

  private get folderPath(): string {
    return this._archivePath + DIRSEP + VERSIONS_FOLDER + DIRSEP + this._folderName;
  }

  /**
   * Creates the archive version folder and index file.
   */
  init(): Promise<void> {
    this._source = require('os').hostname();
    this._index = {};

    return new Promise<void>((resolve, reject) => {
      // Make sure folder does not exist
      checkPathDoesNotExist(this.folderPath)
        .then(resolve)
        .catch((err) => {
          winston.error('Filesystem archive version folder already exists', { path: this.folderPath });
          reject(new Error(`Archive version ${this.folderName} already exists`));
        });
    }).then(() => new Promise<void>((resolve, reject) => {
      // Create folder and index
      mkdirPromise(this.folderPath)
        .then(this.apply.bind(this)) // write properties to file
        .then(resolve)
        .catch((err) => {
          winston.error('Error creating archive version', { path: this.folderPath, error: err });
          reject(new Error(`Error creating archive at ${this.folderPath}`));
        });
    }));
  }

  /**
   * Loads the index file.
   */
  load(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      readFilePromise(this.folderPath + DIRSEP + INDEX_FILE, { encoding: 'utf8' })
        .then(contents => {
          const parsed = yaml.safeLoad(contents);
          this._source = parsed.source;
          this._index  = parsed.files || {}; // TODO: normalize directory separator?
          // TODO: validate file modes and files?
        })
        .then(resolve)
        .catch(err => {
          winston.error('Error loading archive version index file', { version: this.folderPath, error: err });
          reject(new Error(`Error loading archive version ${this.folderName} index`));
        });
    });
  }

  getFiles(): Promise<string[]> {
    return Promise.resolve(Object.keys(this._index));
  }

  getFileStatus(file: string): Promise<string> {
    return Promise.resolve(this._index[file]);
  }

  writeFile(file: string, status: string, readStream?: stream.Readable): Promise<void> {
    if (['add', 'modify', 'delete'].indexOf(status) < 0)
      throw new Error(`Invalid status "${status}"`);

    // Save status to index (will be written to file in apply())
    this._index[file] = status;

    switch (status) {
    case 'add':
    case 'modify':
      if (!readStream)
        throw new Error(`readStream required for "${status}" status`);

      const filePath = this.folderPath + DIRSEP + file;
      return Promise.all([
        mkdirpPromise(path.dirname(filePath)),
        checkPathDoesNotExist(filePath)
          .catch(err => winston.warn('File passed to writeFileStream already exists', { file: filePath }))
      ])
      .then(() => new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);

        function onError(err) {
          winston.error('Error writing archive file', { path: filePath, error: err });
          reject(err);
        }
        readStream.on('error', onError);
        writeStream.on('error', onError);

        // TODO: progress events?
        writeStream.on('open', () => readStream.pipe(writeStream));
        writeStream.once('finish', () => {
          writeStream.end();
          resolve();
        });
      }));

    case 'delete':
      return Promise.resolve();
    }
  }

  createReadStream(file: string): stream.Readable {
    if (file in this._index) {
      return fs.createReadStream(this.folderPath + DIRSEP + file);
    } else {
      return null;
    }
  }

  getFileChecksum(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream: stream.Readable = this.createReadStream(file);
      if (!stream)
        reject(new Error('File not in archive'));

      stream.on('open', () => {
        hashStream(stream)
          .then(resolve)
          .catch(err => {
            winston.error('Archive version file hashing error', { file: file, error: err });
            reject(err);
          });
      });
      stream.on('error', err => {
        winston.error('Error opening archive version file', { file: file, error: err });
        reject(err);
      });
    });
  }

  apply(): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (err) => void) => {
      const data: string = yaml.safeDump({
        source: this._source,
        files: this._index
      });

      writeFilePromise(this.folderPath + DIRSEP + INDEX_FILE, data)
        .then(resolve)
        .catch(err => {
          winston.error('Error persisting archive version to file', { version: this.folderPath, error: err });
          reject(new Error('Error saving archive version index'));
        });
    });
  }

  static fromFolderName(name: string, archivePath: string): FilesystemArchiveVersion {
    const match = FOLDER_NAME_REGEX.exec(name);
    if (match) {
      const year   = match[1];
      const month  = match[2];
      const day    = match[3];
      const hour   = match[4];
      const minute = match[5];
      const second = match[6];

      const timezone  = new Date().getTimezoneOffset();
      const tzHours   = Math.floor(Math.abs(timezone / 60));
      const tzMinutes = Math.abs(timezone % 60);
      const offset = (timezone < 0 ? '+' : '-') +
        (tzHours   < 10 ? '0' : '') + tzHours +
        (tzMinutes < 10 ? '0' : '') + tzMinutes;

      // Convert folder name to date in ISO-8601 YYYY-MM-DDThh:mm:ssTZD format
      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`);
      return new FilesystemArchiveVersion(date, archivePath);
    }
    return null;
  }

  static parseIndexFile(path: string): Promise<{ [file: string]: string }> {
    return new Promise((resolve, reject) => {
      readFilePromise(path)
        .then((buffer: Buffer) => {
          // TODO: implement
        })
        .catch(err => {
          winston.error('Error reading archive version index file', { path: path, error: err });
          reject(new Error('Error reading archive version'));
        })
    });
  }

  private static formatDate(date: Date) {
    const year   = date.getFullYear();
    const month  = (date.getMonth()   <  9 ? '0' : '') + (date.getMonth() + 1);
    const day    = (date.getDate()    < 10 ? '0' : '') + date.getDate();
    const hour   = (date.getHours()   < 10 ? '0' : '') + date.getHours();
    const minute = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    const second = (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
    return `${year}-${month}-${day} ${hour}-${minute}-${second}`;
  }
}
