import Config from './Config';
import BackupJob from './BackupJob';
import RestoreJob from './RestoreJob';

export default class Engine {
  private _config: Config;

  constructor(config: Config) {
    this._config = config;
  }

  runBackup(job: BackupJob) {
    // TODO: implement
  }

  runRestore(job: RestoreJob) {
    // TODO: implement
  }
}
