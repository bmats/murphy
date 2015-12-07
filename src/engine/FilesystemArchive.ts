import Archive from './Archive';
import ArchiveVersion from './ArchiveVersion';
import FilesystemArchiveVersion from './FilesystemArchiveVersion';

export default class FilesystemArchive extends Archive {
  private _path: string;

  constructor(name: string, path: string) {
    super(name);

    this._path = path;
  }

  get path(): string {
    return this._path;
  }

  init(): Promise<void> {
    // TODO: implement
  }

  rebuild(): Promise<void> {
    // TODO: implement
  }

  createVersion(): Promise<ArchiveVersion> {
    // TODO: implement
  }

  getVersions(): Promise<ArchiveVersion[]> {
    // TODO: implement
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
