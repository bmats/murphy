import * as async from 'async';
import * as fs from 'fs';
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

  private static removeRootDirFromPaths(paths: string[], rootDir: string): string[] {
    return paths.map((path: string) => {
      // Cut off the root directory from the beginning
      if (path.substr(0, rootDir.length) === rootDir) {
        // Don't start with a '/'
        if (path.charAt(rootDir.length) === DIRSEP) {
          path = path.substr(rootDir.length + 1);
        } else {
          path = path.substr(rootDir.length);
        }
      }

      return path;
    });
  }

  getFiles(): Promise<string[]> {
    return new Promise<string[]>((resolve: (files: string[]) => void, reject: (reason: any) => void) => {
      let files: string[] = [];

      function statAsyncAndList(rootPath: string, paths: string[]) {
        async.map(paths, fs.stat, (err, stats: fs.Stats[]) => {
          stats.forEach((stat: fs.Stats, i: number) => {
            if (stat.isFile()) {
              // Save the file path
              files.push(paths[i]); // TODO: remove root path name
            } else if (stat.isDirectory()) {
              recursiveList(paths[i]);
            }
          });
        });
      }

      function recursiveList(path: string) {
        fs.readdir(path, (err, files: string[]) => {
          statAsyncAndList(files);
        });
      }

      statAsyncAndRecurseFolders('', this._paths);

      // TODO: before returning files, do this:
      files = Source.removeRootDirFromPaths(files, this._rootDir);
    });
  }

  createReadStream(file: string): stream.Readable {
    // TODO: implement
  }

  getFileChecksum(file: string): Promise<string> {
    // TODO: implement
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
}
