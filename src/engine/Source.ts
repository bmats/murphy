import * as async from 'async';
import * as fs from 'fs';
const FileQueue = require('filequeue');
import * as crypto from 'crypto';
import {sep as DIRSEP} from 'path';
import * as stream from 'stream';
import * as winston from 'winston';
import {hashStream} from './util';

const fq = new FileQueue(100, true);

export default class Source {
  private _name: string;
  private _paths: string[];
  private _rootDir: string;

  constructor(name: string, paths: string[]) {
    this._name = name;
    this._paths = paths;
    this._rootDir = Source._findCommonRootDir(paths);
  }

  get name(): string {
    return this._name;
  }

  get paths(): string[] {
    return this._paths;
  }

  getFiles(): Promise<string[]> {
    const self = this;
    return new Promise<string[]>((resolve: (files: string[]) => void, reject: (reasons: string[]) => void) => {
      let files: string[] = [];
      let errors: string[] = [];

      let directoryQueue = async.queue(checkDirectory);
      directoryQueue.pause();
      directoryQueue.drain = () => {
        // If there are no errors, resolve, otherwise reject
        if (errors.length === 0) {
          files.sort();
          resolve(files.map(file => Source._removeRootDirFromPath(file, self._rootDir)));
        } else {
          errors.sort();
          reject(errors);
        }
      };

      function checkFile(path: string, callback: (err) => any) {
        fs.stat(path, (err, stats: fs.Stats) => {
          if (err) {
            winston.warn('fs.stat failed', { file: path, error: err });
            let shortPath = Source._removeRootDirFromPath(path, self._rootDir);
            errors.push(`Reading ${shortPath} failed (${err})`);
            callback(undefined);
            return;
          }

          if (stats.isFile()) {
            // Save the file path
            // TODO: filter regex
            files.push(path);
          } else if (stats.isDirectory()) {
            // Queue the directory to be traversed
            directoryQueue.push(path);
          }
          callback(undefined);
        });
      }

      function checkDirectory(path: string, callback: (err) => any) {
        fs.readdir(path, (err, files: string[]) => {
          if (err) {
            winston.warn('fs.readdir failed', { dir: path, error: err });
            let shortPath = Source._removeRootDirFromPath(path, self._rootDir);
            errors.push(`Opening folder ${shortPath} failed (${err})`);
            callback(undefined);
            return;
          }

          // Normalize path to end with '/' for concat below
          if (path.charAt(path.length - 1) !== DIRSEP) path += DIRSEP;

          async.each(files.map(file => path + file), checkFile, callback);
        });
      }

      // Check the initial paths
      async.each(self._paths, checkFile, (err) => {
        // Start processing the directories left over
        if (directoryQueue.length() > 0) {
          directoryQueue.resume();
        } else {
          // queue.drain() is not called when empty and resumed
          directoryQueue.drain();
        }
      });
    });
  }

  createReadStream(file: string): stream.Readable {
    let root = this._rootDir;
    if (this._rootDir.length > 0 && this._rootDir.charAt(this._rootDir.length - 1) !== DIRSEP) root += DIRSEP;
    return fq.createReadStream(root + file);
  }

  getFileChecksum(file: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const fileStream: stream.Readable = this.createReadStream(file);

      fileStream.on('open', () => {
        hashStream(fileStream)
          .then(result => {
            fileStream.destroy();
            resolve(result);
          })
          .catch(err => {
            winston.error('Source file hashing error', { file: file, error: err });
            fileStream.destroy();
            reject(err);
          });
      });
      fileStream.on('error', err => {
        winston.error('Error opening source file', { file: file, error: err });
        fileStream.destroy();
        reject(err);
      });
    });
  }

  serialize(): any {
    return {
      name: this.name,
      paths: this.paths
    };
  }

  static unserialize(data: any): Source {
    let source = new Source(data.name, data.paths);
    return source;
  }

  static _findCommonRootDir(paths: string[]): string {
    if (paths.length === 0) return '';
    if (paths.length === 1) return paths[0];

    // Split each path up into folders
    const pathFolders: string[][] = paths.map(path =>
      path.split(DIRSEP).filter((e, i) => i === 0 || e.length > 0)); // remove empty folder names, excluding root
    for (let folderIndex = 0; folderIndex < pathFolders[0].length; ++folderIndex) {
      let folder = pathFolders[0][folderIndex];

      // Find the first mismatch in the other folder paths
      for (let j = 1; j < pathFolders.length; ++j) {
        if (pathFolders[j].length <= folderIndex || folder !== pathFolders[j][folderIndex]) {
          // Concat all the folders before this one
          return pathFolders[0].slice(0, folderIndex).join(DIRSEP);
        }
      }
    }

    // All of the folders matched... duplicates?
    winston.warn('Possible duplicate source paths', { paths: paths });
    return paths[0];
  }

  static _removeRootDirFromPath(path: string, rootDir: string): string {
    // Cut off the root directory from the beginning
    if (path.substr(0, rootDir.length) === rootDir) {
      // Don't start with a '/'
      if (path.charAt(rootDir.length) === DIRSEP) {
        return path.substr(rootDir.length + 1);
      } else {
        return path.substr(rootDir.length);
      }
    }
    return path;
  }
}
