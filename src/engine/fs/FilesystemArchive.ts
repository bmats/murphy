import * as fs from 'fs';
import {sep as DIRSEP} from 'path';
import * as winston from 'winston';
import Archive from '../Archive';
import ArchiveVersion from '../ArchiveVersion';
import FilesystemArchiveVersion from './FilesystemArchiveVersion';
import {checkPathDoesNotExist, mkdirPromise, readdirPromise, writeFilePromise} from '../util';

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

  rebuild(): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (err) => void) => {
      // TODO: implement
    });
  }

  createVersion(): Promise<FilesystemArchiveVersion> {
    const version = new FilesystemArchiveVersion(new Date(), this.path);
    return version.init()
      .then(() => version);
  }

  getVersions(): Promise<FilesystemArchiveVersion[]> {
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
        .then(Promise.all(versions.map(version => version.load))) // load each version
        .then(() => resolve(versions))
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
