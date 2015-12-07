import * as stream from 'stream';

abstract class ArchiveVersion {
  static get FILE_ADDED() { return 'added' };

  private _date: Date;

  constructor(date: Date) {
    this._date = date;
  }

  get date(): Date {
    return this._date;
  }

  /**
   * List all of the files contained in this version, including deleted.
   */
  abstract getFiles(): Promise<string[]>;

  /**
   * Get the status ("new", "modified", "deleted") of a file in this version.
   */
  abstract getFileStatus(): string;

  /**
   * Write a stream to a file in the version and save the file status.
   * If the status is "deleted", the stream can be omitted.
   */
  abstract writeFileStream(file: string, status: string, stream?: stream.Readable): Promise<void>;

  /**
   * Return a stream for reading the file.
   */
  abstract createReadStream(file: string): stream.Readable;

  /**
   * Compute the checksum of a file in this version.
   */
  abstract getFileChecksum(file: string): Promise<string>;

  /**
   * Persist changes to the version.
   * Called after files are added to the version.
   */
  abstract apply(): Promise<void>;
}
export default ArchiveVersion;