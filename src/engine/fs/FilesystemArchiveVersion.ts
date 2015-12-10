import * as stream from 'stream';
import ArchiveVersion from '../ArchiveVersion';

const FOLDER_NAME_REGEX = /(\d{4})-(\d{2})-(\d{2}) (\d{2})-(\d{2})-(\d{2})/;

export default class FilesystemArchiveVersion extends ArchiveVersion {
  private _folderName: string;
  constructor(date: Date) {
    super(date);
    this._folderName = FilesystemArchiveVersion.formatDate(date);
  }

  get folderName(): string {
    return this._folderName;
  }

  getFiles(): Promise<string[]> {
    return new Promise((resolve: (files: string[]) => void, reject: (err) => void) => {
      // TODO: implement
    });
  }

  getFileStatus(): string {
    // TODO: implement
    return null;
  }

  writeFileStream(file: string, status: string, stream?: stream.Readable): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (err) => void) => {
      // TODO: implement
    });
  }

  createReadStream(file: string): stream.Readable {
    // TODO: implement
    return null;
  }

  getFileChecksum(file: string): Promise<string> {
    return new Promise((resolve: (checksum: string) => void, reject: (err) => void) => {
      // TODO: implement
    });
  }

  apply(): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (err) => void) => {
      // TODO: implement
    });
  }

  static fromFolderName(name: string): FilesystemArchiveVersion {
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
      return new FilesystemArchiveVersion(date);
    }
    return null;
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
