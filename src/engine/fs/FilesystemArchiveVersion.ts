import * as fs from 'fs';
const FileQueue = require('filequeue');
import * as moment from 'moment';
import * as path from 'path';
import * as stream from 'stream';
import {sep as DIRSEP} from 'path';
import * as Promise from 'bluebird';
import * as winston from 'winston';
import * as yaml from 'js-yaml';
import ArchiveVersion from '../ArchiveVersion';
import {checkPathDoesNotExist, hashStream, mkdirAsync, mkdirpAsync, readFileAsync, writeFileAsync} from '../util';

const fq = new FileQueue(100, true);
const writeFileQueuedAsync: (file: string, data: any, options?: {} | string) => Promise<{}> = Promise.promisify(fq.writeFile.bind(fq));

const FOLDER_NAME_REGEX = /(\d{4})-(\d{2})-(\d{2}) (\d{2})-(\d{2})-(\d{2})/;
const VERSIONS_FOLDER: string = 'Versions';
const INDEX_FILE: string = '.index';
const DELETED_SUFFIX: string = '.deleted';

interface FileInfo {
  status: string;
  checksum: string;
}

interface FileIndex {
  [file: string]: FileInfo;
}

export default class FilesystemArchiveVersion extends ArchiveVersion {
  private _archivePath: string;
  private _folderName: string;
  private _source: string;
  private _index: FileIndex;

  constructor(date: Date, archivePath: string) {
    super(date);
    this._archivePath = archivePath;
    this._folderName = moment(date).format('YYYY-MM-DD HH-mm-ss');
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
      mkdirAsync(this.folderPath)
        .then(this.apply.bind(this)) // write properties to file
        .then(() => resolve())
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
      readFileAsync(this.folderPath + DIRSEP + INDEX_FILE, { encoding: 'utf8' })
        .then(contents => {
          const parsed = yaml.safeLoad(contents);
          this._source = parsed.source;
          this._index  = FilesystemArchiveVersion.parseIndexFile(parsed); // TODO: normalize directory separator?
          // TODO: validate file modes and files?
        })
        .then(resolve)
        .catch(err => {
          winston.error('Error loading archive version index file', { version: this.folderPath, error: err });
          reject(new Error(`Error loading archive version "${this.folderName}" index`));
        });
    });
  }

  getFiles(): Promise<string[]> {
    return Promise.resolve(Object.keys(this._index));
  }

  getFileStatus(file: string): Promise<string> {
    return Promise.resolve(this._index[file] && this._index[file].status);
  }

  writeFile(file: string, status: string, readStream?: stream.Readable, checksum?: string): Promise<void> {
    if (['add', 'modify', 'delete'].indexOf(status) < 0)
      throw new Error(`Invalid status "${status}"`);

    // Save status to index (will be written to file in apply())
    this._index[file] = {
      status: status,
      checksum: checksum
    };

    const filePath = this.folderPath + DIRSEP + file;
    switch (status) {
    case 'add':
    case 'modify':
      if (!readStream || !checksum)
        throw new Error(`readStream and checksum required for "${status}" status`);

      return Promise.all([
        mkdirpAsync(path.dirname(filePath)),
        checkPathDoesNotExist(filePath)
          .catch(err => winston.warn('File passed to writeFileStream already exists', { file: filePath }))
      ])
      .then(() => new Promise<void>((resolve, reject) => {
        const writeStream = fq.createWriteStream(filePath);
        writeStream.on('error', onError);
        readStream.on('error', onError);

        writeStream.on('open', () => readStream.pipe(writeStream));
        writeStream.once('finish', () => {
          writeStream.close();
          readStream.removeListener('error', onError);
          resolve();
        });

        function onError(err) {
          winston.error('Error writing archive file', { path: filePath, error: err });
          writeStream.close();
          readStream.removeListener('error', onError);
          reject(err);
        }
      }));

    case 'delete':
      // Write an empty "{filename}.deleted" file
      return mkdirpAsync(path.dirname(filePath + DELETED_SUFFIX))
        .then(() => writeFileQueuedAsync(filePath + DELETED_SUFFIX, ''))
        .then(() => {});
    }
  }

  createReadStream(file: string): stream.Readable {
    if (file in this._index) {
      return fq.createReadStream(this.folderPath + DIRSEP + file);
    } else {
      return null;
    }
  }

  getFileChecksum(file: string): Promise<string> {
    return Promise.resolve(this._index[file] && this._index[file].checksum);
  }

  apply(): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (err) => void) => {
      const data = { source: this._source };
      FilesystemArchiveVersion.buildIndexFile(data, this._index);

      writeFileAsync(this.folderPath + DIRSEP + INDEX_FILE, yaml.safeDump(data))
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

  static parseIndexFile(data: any): FileIndex {
    const index: FileIndex = {};
    ['add', 'modify', 'delete'].forEach(status => {
      if (!data[status]) return;
      for (let file in data[status]) {
        index[file] = {
          status: status,
          checksum: data[status][file]
        };
      }
    });
    return index;
  }

  static buildIndexFile(data: any, index: FileIndex) {
    data['add'] = {};
    data['modify'] = {};
    data['delete'] = {};

    for (let file in index) {
      const info = index[file];
      data[info.status][file] = info.checksum || '';
    }
  }
}
