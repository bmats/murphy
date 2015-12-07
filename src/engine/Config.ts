import * as fs from 'fs';
import * as winston from 'winston';
import Source from './Source';

export default class Config {
  private _sources: Source[] = [];

  static get fileName(): string {
    const homeDir: string = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
    return `${homeDir}/.murphyconfig.json`;
  }

  static load(callback: (config: Config, err: any) => void): void {
    const file: string = Config.fileName;
    fs.access(file, fs.F_OK, err => {
      if (err) {
        // File does not exist yet, so return empty config
        winston.info('Config file does not exist yet');
        callback(new Config(), null);
      } else {
        // Read existing file
        fs.readFile(file, (err: any, data: Buffer) => {
          if (err) {
            winston.error('Error reading config file', { error: err });
            callback(null, err);
            return;
          }

          // Parse JSON
          const json: any = data.toJSON();
          if (!json) {
            winston.error('Error parsing config file', { data: data.toString() });
            callback(null, 'Error parsing config file.');
            return;
          }

          let config = new Config();
          config._sources = json.sources.map(s => Source.unserialize(s));
          winston.info('Loaded config file');
          callback(config, null);
        });
      }
    });
  }

  get sources(): Source[] {
    return this._sources;
  }

  addSource(source: Source): void {
    this._sources.push(source);
    this.write();
  }

  private write(): void {
    const data = {
      sources: this._sources.map(s => s.serialize())
    };

    winston.info('Writing config file...');
    fs.writeFile(Config.fileName, JSON.stringify(data), err => {
      winston.error('Writing config file failed', { error: err });
    });
  }
}
