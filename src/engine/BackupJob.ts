import {EventEmitter} from 'events';
import Source from './Source';
import Archive from './Archive';

export default class BackupJob extends EventEmitter {
  private _source: Source;
  private _destination: Archive;

  constructor(source: Source, destination: Archive) {
    super();

    this._source = source;
    this._destination = destination;
  }

  get source(): Source {
    return this._source;
  }

  get destination(): Archive {
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
