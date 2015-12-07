import * as async from 'async';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as stream from 'stream';
import * as winston from 'winston';

const DIRSEP = '/';

export default class Source {
  private _name: string;
  private _paths: string[];
  private _rootDir: string;

  constructor(name: string, paths: string[]) {
    this._name = name;
    this._paths = paths;
    this._rootDir = Source.findCommonRootDir(paths);
  }

  get name(): string {
    return this._name;
  }

  get paths(): string[] {
    return this._paths;
  }

  getFiles(): Promise<string[]> {
    return new Promise<string[]>((resolve: (files: string[]) => void, reject: (reasons: string[]) => void) => {
      let files: string[] = [];
      let errors: string[] = [];

      let directoryQueue = async.queue(checkDirectory);
      directoryQueue.pause();
      directoryQueue.drain = () => {
        // If there are no errors, resolve, otherwise reject
        if (errors.length === 0) {
          files.sort();
          resolve(files.map(file => Source.removeRootDirFromPath(file, this._rootDir)));
        } else {
          errors.sort();
          reject(errors);
        }
      };

      function checkFile(path: string, callback: (err) => any) {
        fs.stat(path, (err, stats: fs.Stats) => {
          if (err) {
            winston.warn('fs.stat failed', { file: path, error: err });
            let shortPath = Source.removeRootDirFromPath(path, this._rootDir);
            errors.push(`Reading ${shortPath} failed (${err})`);
            callback(null);
            return;
          }

          if (stats.isFile()) {
            // Save the file path
            files.push(path);
          } else if (stats.isDirectory()) {
            // Queue the directory to be traversed
            directoryQueue.push(path);
          }
          callback(null);
        });
      }

      function checkDirectory(path: string, callback: (err) => any) {
        fs.readdir(path, (err, files: string[]) => {
          if (err) {
            winston.warn('fs.readdir failed', { dir: path, error: err });
            let shortPath = Source.removeRootDirFromPath(path, this._rootDir);
            errors.push(`Opening folder ${shortPath} failed (${err})`);
            callback(null);
            return;
          }

          // Normalize path to end with '/' for concat below
          if (!path.endsWith(DIRSEP)) path += DIRSEP;

          async.each(files.map(file => path + file), checkFile, callback);
        });
      }

      // Check the initial paths
      async.each(this._paths, checkFile, (err) => {
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
    file = this._rootDir + (this._rootDir.endsWith(DIRSEP) ? '' : DIRSEP) + file;
    return fs.createReadStream(file);
  }

  getFileChecksum(file: string): Promise<string> {
    return new Promise((resolve: (checksum: string) => void, reject: (err) => any) => {
      let fileStream: stream.Readable = this.createReadStream(file);

      let hash: stream.Duplex = crypto.createHash('sha1');
      hash.setEncoding('hex');

      fileStream.on('end', () => {
        hash.end();
        resolve(hash.read().toString());
      });
      fileStream.on('error', err => {
        winston.error('Hashing error', { file: file, error: err });
        reject(err);
      })

      fileStream.pipe(hash);
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

  private static findCommonRootDir(paths: string[]): string {
    if (paths.length === 0) return '';
    if (paths.length === 1) return paths[0];

    // Split each path up into folders
    const pathFolders: string[][] = paths.map(path => path.split(DIRSEP));
    for (let folderIndex = 0; folderIndex < pathFolders[0].length; ++folderIndex) {
      let folder = pathFolders[0][folderIndex];

      // Find the first mismatch in the other folder paths
      for (let j = 1; j < pathFolders.length; ++j) {
        if (folder !== pathFolders[j][folderIndex]) {
          // Concat all the folders before this one
          return pathFolders[0].slice(0, folderIndex).join(DIRSEP);
        }
      }
    }

    // All of the folders matched... duplicates?
    winston.warn('Possible duplicate source paths', { paths: paths });
    return paths[0];
  }

  private static removeRootDirFromPath(path: string, rootDir: string): string {
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