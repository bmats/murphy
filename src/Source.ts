export default class Source {
  private _name: string;
  private _paths: string[];

  constructor(name: string, paths: string[]) {
    this._name = name;
    this._paths = paths;
  }

  get name(): string {
    return this._name;
  }

  get paths(): string[] {
    return this._paths;
  }
}
