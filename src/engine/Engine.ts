import Config from './Config';
import BackupJob from './BackupJob';
import RestoreJob from './RestoreJob';

export default class Engine {
  private _config: Config;

  constructor() {
    Config.load((config: Config, err) => {
      if (err) {
        // TODO: handle
        return;
      }

      this._config = config;
    });
  }

  runBackup(job: BackupJob) {
    // TODO: implement
  }

  runRestore(job: RestoreJob) {
    // TODO: implement
  }
}
