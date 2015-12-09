import * as stream from 'stream';
import ArchiveVersion from '../ArchiveVersion';

export default class FilesystemArchiveVersion extends ArchiveVersion {
  constructor(date: Date) {
    super(date);
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
}
