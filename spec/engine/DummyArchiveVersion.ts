import * as stream from 'stream';
import ArchiveVersion from '../../src/engine/ArchiveVersion';

export default class DummyArchiveVersion extends ArchiveVersion {
  constructor(date) {
    super(date);
  }

  getFiles(): Promise<string[]> {
    return null;
  }

  getFileStatus(file: string): Promise<string> {
    return null;
  }

  writeFile(file: string, status: string, stream?: stream.Readable): Promise<void> {
    return null;
  }

  createReadStream(file: string): stream.Readable {
    return null;
  }

  getFileChecksum(file: string): Promise<string> {
    return null;
  }

  apply(): Promise<void> {
    return null;
  }
}
