import * as fs from 'fs';
import {sep as DIRSEP} from 'path';
import * as winston from 'winston';
import * as Q from 'q';
import Archive from '../Archive';
import ArchiveVersion from '../ArchiveVersion';
import FilesystemArchiveVersion from './FilesystemArchiveVersion';

function inverseStat(path: string, callback: (err) => any) {
  fs.stat(path, (err, stats: fs.Stats) => callback(err ? undefined : 'Path exists'));
}

const README_FILENAME: string = 'READ ME.txt';
const LATEST_FOLDER: string = 'Latest';
const VERSIONS_FOLDER: string = 'Versions';

const README_BODY: string = `Backed up using Murphy (https://github.com/bmats/murphy).\r
\r
* Restoring versions using Murphy\r
  1. Download Murphy from https://github.com/bmats/murphy/releases\r
  2. Open Murphy and click "Restore"\r
  3. Choose this folder and the folder to restore the backup into\r
  4. Click "Start Restore"\r
\r
* Restoring the latest version without Murphy\r
  If you are on Windows:\r
    1. Open the "Latest" folder\r
    2. Copy everything inside to where you want the backup to be restored\r
  If you are on Mac OS/Linux:\r
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
    return new Promise<void>((resolve: () => void, reject: (err) => void) => {
      // Check if folder exists
      Q.nfcall(inverseStat, this.path)
        .catch((err) => {
          winston.error('Filesystem archive folder already exists', { path: this.path });
          reject('Archive folder already exists');
        })

        // Make folder
        .then(Q.denodeify(fs.mkdir, this.path))
        .catch((err) => {
          winston.error('Error making archive folder', { path: this.path, error: err });
          reject('Error creating archive folder');
        })

        // Make archive structure
        .then(Q.denodeify(fs.writeFile, this.path + DIRSEP + README_FILENAME, this.getReadMeText()))
        .then(Q.denodeify(fs.mkdir, this.path + DIRSEP + LATEST_FOLDER))
        .then(Q.denodeify(fs.mkdir, this.path + DIRSEP + VERSIONS_FOLDER))
        .catch((err) => {
          winston.error('Error building archive', { error: err });
          reject('Error building archive');
        })

        .then(resolve);
    });
  }

  rebuild(): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (err) => void) => {
      // TODO: implement
    });
  }

  createVersion(): Promise<ArchiveVersion> {
    return new Promise((resolve: (version: ArchiveVersion) => void, reject: (err) => void) => {
      // TODO: implement
    });
  }

  getVersions(): Promise<ArchiveVersion[]> {
    return new Promise((resolve: (versions: ArchiveVersion[]) => void, reject: (err) => void) => {
      // TODO: implement
    });
  }

  private getReadMeText(): string {
    const time: string = new Date().toString();
    return `${this.name}\r\nCreated at ${time}.\r\n\r\n` + README_BODY;
  }

  serialize(): any {
    let data = super.serialize();
    data.path = this.path;
    return data;
  }

  static unserialize(data: any): FilesystemArchive {
    return new FilesystemArchive(data.name, data.path);
  }
}
