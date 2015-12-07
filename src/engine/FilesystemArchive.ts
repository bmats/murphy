import Archive from './Archive';

export default class FilesystemArchive extends Archive {
  private _path: string;

  constructor(name: string, path: string) {
    super(name);

    this._path = path;
  }

  get path(): string {
    return this._path;
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
