import * as fs from 'fs';
import * as winston from 'winston';
import Source from './Source';
import Archive from './Archive';

export default class Config {
  private _sources: Source[] = [];
  private _archives: Archive[] = [];

  static get fileName(): string {
    const homeDir: string = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
    return `${homeDir}/.murphyconfig.json`;
  }

  static load(): Promise<Config> {
    return new Promise<Config>((resolve, reject) => {
      const fileName: string = Config.fileName;
      fs.stat(fileName, (err, stats: fs.Stats) => {
        if (err) {
          // File does not exist yet, so return empty config
          winston.info('Config file does not exist yet');
          resolve(new Config());
          return;
        }

        // Read existing file
        fs.readFile(fileName, { encoding: 'utf8' }, (err: any, data: string) => {
          if (err) {
            winston.error('Error reading config file', { error: err });
            reject(err);
            return;
          }

          try {
            // Parse JSON
            const json: any = JSON.parse(data);
            if (!json.sources || !json.archives) {
              winston.error('Invalid config file', { json: json });
              reject(new Error('Invalid config file.'));
              return;
            }

            let config = new Config();
            config._sources = json.sources.map(s => Source.unserialize(s));
            config._archives = json.archives.map(a => Archive.unserialize(a));
            winston.info('Loaded config file');
            resolve(config);
          } catch (e) {
            winston.error('Error parsing config file', { data: data });
            reject(new Error('Error reading config file.'));
          }
        });
      });
    });
  }

  get sources(): Source[] {
    return this._sources;
  }

  get archives(): Archive[] {
    return this._archives;
  }

  addSource(source: Source): void {
    this._sources.push(source);
    this.write();
  }

  addArchive(archive: Archive): void {
    this._archives.push(archive);
    this.write();
  }

  private write(): void {
    const data = {
      sources: this._sources.map(s => s.serialize()),
      archives: this._archives.map(a => a.serialize())
    };

    fs.writeFile(Config.fileName, JSON.stringify(data), err => {
      if (err) {
        winston.error('Writing config file failed', { error: err });
      }
    });
  }
}
