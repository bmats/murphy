import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import Archive from '../Archive';
import ArchiveVersion from '../ArchiveVersion';
import FilesystemArchiveVersion from './FilesystemArchiveVersion';
import {checkPathDoesNotExist, mkdirPromise, mkdirpPromise, readdirPromise, symlinkPromise, writeFilePromise} from '../util';

const DIRSEP = path.sep;
const README_FILENAME: string = 'READ ME.txt';
const LATEST_FOLDER: string = 'Latest';
const VERSIONS_FOLDER: string = 'Versions';

const README_BODY: string = `Backed up using Murphy (https://github.com/bmats/murphy).\r
\r
To restore any version using Murphy:\r
  1. Download Murphy from https://github.com/bmats/murphy/releases\r
  2. Open Murphy and click "Restore"\r
  3. Choose this folder and the folder to restore the backup into\r
  4. Click "Start Restore"\r
\r
To restore the latest version without Murphy:\r
  If you are on Windows:\r
    1. Open the "Latest" folder\r
    2. Copy everything inside to where you want the backup to be restored\r
  If you are on Mac OS X:\r
    1. Open the Terminal application\r
    2. Type: "cd", space, and drag the "Latest" folder onto the Terminal to get its location\r
    3. Press enter\r
    4. Type: "cp -r *", space, and drag the folder into which you want the backup to be restored onto the Terminal\r
    5. Press enter\r
`;

export default class FilesystemArchive extends Archive {
  private _path: string;
  private _versionCache: ArchiveVersion[] = null;

  constructor(name: string, path: string) {
    super(name, 'FilesystemArchive');

    this._path = path;
  }

  get path(): string {
    return this._path;
  }

  init(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Make sure folder does not exist
      checkPathDoesNotExist(this.path)
        .then(resolve)
        .catch((err) => {
          winston.error('Filesystem archive folder already exists', { path: this.path });
          reject(new Error('Archive folder already exists'));
        });
    }).then(() => new Promise<void>((resolve, reject) => {
      // Make folder
      mkdirPromise(this.path)
        .then(resolve)
        .catch((err) => {
          winston.error('Error making archive folder', { path: this.path, error: err });
          reject(new Error('Error creating archive folder'));
        });
    })).then(() => new Promise<void>((resolve, reject) => {
      // Make archive structure
      writeFilePromise(this.path + DIRSEP + README_FILENAME, this.getReadMeText())
        .then(mkdirPromise(this.path + DIRSEP + LATEST_FOLDER))
        .then(mkdirPromise(this.path + DIRSEP + VERSIONS_FOLDER))
        .then(resolve)
        .catch((err) => {
          winston.error('Error building archive', { error: err });
          reject(new Error('Error building archive'));
        });
    }));
  }

  /**
   * Updates the Latest folder with symlinks from the versions.
   */
  rebuild(): Promise<void> {
    let foundFiles: {[file: string]: FilesystemArchiveVersion} = {};
    let versions: FilesystemArchiveVersion[];
    let versionFiles: string[][] = [];

    return this.getVersions()
      .then(ver => versions = ver)
      .then(() =>
        // Get the files for each version
        Promise.all(versions.map((version, i) =>
          version.getFiles()
            .then(files => versionFiles[i] = files)
        ))
      ).then(() => {
        versionFiles.forEach((files, i) => {
          const version: FilesystemArchiveVersion = versions[i];
          // Check if each file has not been found already
          // If not, then save its version
          files.forEach((file: string) => {
            if (!(file in foundFiles))
              foundFiles[file] = version;
          });
        });

        // Write out all of the symlinks
        return Promise.all(Object.keys(foundFiles).map(file => {
          const version: FilesystemArchiveVersion = foundFiles[file];
          return version.getFileStatus(file)
            .then(status => {
              switch (status) {
              case 'add':
              case 'modify':
                // Write the symlink for added/modified files
                const symlinkPath: string = this.path + DIRSEP + LATEST_FOLDER + DIRSEP + file;
                return mkdirpPromise(path.dirname(symlinkPath))
                  .then(symlinkPromise(
                    this.path + DIRSEP + VERSIONS_FOLDER + DIRSEP + version.folderName + DIRSEP + file,
                    symlinkPath));
              case 'delete':
                // Don't write anything for deleted files
                return Promise.resolve();
              default:
                throw new Error(`Invalid file status "${status}" ${file} ${version.folderName}`);
              }
            });
        }));
      }).then(() => {});
  }

  createVersion(): Promise<FilesystemArchiveVersion> {
    const version = new FilesystemArchiveVersion(new Date(), this.path);
    return version.init()
      .then(() => {
        if (this._versionCache) this._versionCache.push(version);
        return version;
      });
  }

  getVersions(): Promise<FilesystemArchiveVersion[]> {
    // Use already loaded versions if possible
    if (this._versionCache) return Promise.resolve(this._versionCache);

    return new Promise((resolve, reject) => {
      let versions: FilesystemArchiveVersion[] = [];
      readdirPromise(this.path + DIRSEP + VERSIONS_FOLDER)
        .then(files => {
          // Create all the versions
          files.forEach(folder => {
            const version = FilesystemArchiveVersion.fromFolderName(folder, this.path);
            if (version) {
              versions.push(version);
            }
          });

          // Sort in descending date order
          versions.sort((a, b) => b.date.getTime() - a.date.getTime());
        })
        .then(() => Promise.all(versions.map(version => version.load()))) // load each version
        .then(() => {
          this._versionCache = versions;
          resolve(versions);
        })
        .catch(err => {
          winston.error('Error listing archive versions', { path: this.path, error: err });
          reject(new Error('Error finding versions'));
        });
    });
  }

  serialize(): any {
    let data = super.serialize();
    data.path = this.path;
    return data;
  }

  static unserialize(data: any): FilesystemArchive {
    return new FilesystemArchive(data.name, data.path);
  }

  private getReadMeText(): string {
    const time: string = new Date().toString();
    return `${this.name}\r\nCreated at ${time}.\r\n\r\n` + README_BODY;
  }
}
