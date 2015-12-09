import {EventEmitter} from 'events';
import Source from './Source';
import Archive from './Archive';
import ArchiveVersion from './ArchiveVersion';

export default class RestoreJob extends EventEmitter {
  private _source: Archive;
  private _version: ArchiveVersion;
  private _destination: string;

  constructor(source: Archive, version: ArchiveVersion, destination: string) {
    super();

    this._source = source;
    this._version = version;
    this._destination = destination;
  }

  get source(): Archive {
    return this._source;
  }

  get version(): ArchiveVersion {
    return this._version;
  }

  get destination(): string {
    return this._destination;
  }

  updateStatus(progress: number, message: string): void {
    this.emit('status', {
      progress: progress,
      message: message
    });
  }

  stop() {
    this.emit('stop');
  }
}
