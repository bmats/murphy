import * as stream from 'stream';
import ArchiveVersion from './ArchiveVersion';

export default class FilesystemArchiveVersion extends ArchiveVersion {
  constructor(date: Date) {
    super(date);
  }

  getFiles(): Promise<string[]> {
    // TODO: implement
  }

  getFileStatus(): string {
    // TODO: implement
  }

  writeFileStream(file: string, status: string, stream?: stream.Readable): Promise<void> {
    // TODO: implement
  }

  createReadStream(file: string): stream.Readable {
    // TODO: implement
  }

  getFileChecksum(file: string): Promise<string> {
    // TODO: implement
  }

  apply(): Promise<void> {
    // TODO: implement
  }
}
