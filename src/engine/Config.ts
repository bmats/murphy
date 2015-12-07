import * as fs from 'fs';
import * as winston from 'winston';
import Source from './Source';

export default class Config {
  private _sources: Source[] = [];

  static get fileName(): string {
    const homeDir: string = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
    return `${homeDir}/.murphyconfig.json`;
  }

  static load(callback: (err: any, config: Config) => void): void {
    const fileName: string = Config.fileName;
    fs.stat(fileName, (err, stats: fs.Stats) => {
      if (err) {
        // File does not exist yet, so return empty config
        winston.info('Config file does not exist yet');
        callback(undefined, new Config());
        return;
      }

      // Read existing file
      fs.readFile(fileName, { encoding: 'utf8' }, (err: any, data: string) => {
        if (err) {
          winston.error('Error reading config file', { error: err });
          callback(err, undefined);
          return;
        }

        try {
          // Parse JSON
          const json: any = JSON.parse(data);
          if (!json.sources) {
            winston.error('Invalid config file', { json: json });
            callback('Invalid config file.', undefined);
            return;
          }

          let config = new Config();
          config._sources = json.sources.map(s => Source.unserialize(s));
          winston.info('Loaded config file');
          callback(undefined, config);
        } catch (e) {
          winston.error('Error parsing config file', { data: data });
          callback('Error reading config file.', undefined);
        }
      });
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

    fs.writeFile(Config.fileName, JSON.stringify(data), err => {
      if (err) {
        winston.error('Writing config file failed', { error: err });
      }
    });
  }
}
