import * as winston from 'winston';
import ArchiveVersion from './ArchiveVersion';
import FilesystemArchive from './FilesystemArchive';

abstract class Archive {
  private _name: string;
  private _type: string;

  constructor(name: string) {
    this._name = name;

    if (this instanceof FilesystemArchive)
      this._type = 'FilesystemArchive';
    else
      winston.warn('Unknown archive instance type', { instance: this });
  }

  get name(): string {
    return this._name;
  }

  /**
   * Set up the archive for the first time.
   */
  abstract init(): Promise<void>;

  /**
   * Apply changes to the archive when a new version is added.
   * Called after a new version is added.
   */
  abstract rebuild(): Promise<void>;

  /**
   * Add a new version to the archive.
   */
  abstract createVersion(): Promise<ArchiveVersion>;

  /**
   * List the versions contained in the archive.
   */
  abstract getVersions(): Promise<ArchiveVersion[]>;

  serialize(): any {
    return {
      name: this._name,
      type: this._type
    };
  }

  static unserialize(data: any): Archive {
    switch (data.type) {
      case 'FilesystemArchive':
        return FilesystemArchive.unserialize(data);
      default:
        winston.warn('Unknown serialized archive type', { type: data.type, data: data });
        return null;
    }
  }
}
export default Archive;
