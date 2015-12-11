import * as crypto from 'crypto';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as stream from 'stream';
import * as Bluebird from 'bluebird';

export function checkPathDoesNotExist(path: string): Promise<void> {
  return new Promise<void>((resolve: () => void, reject: (err) => void) => {
    fs.stat(path, (err, stats: fs.Stats) => {
      if (err) resolve();
      else reject(new Error('Path exists'));
    });
  });
}

export function hashStream(stream: stream.Readable): Promise<string> {
  return new Promise((resolve: (checksum: string) => void, reject: (err) => any) => {
    let hash: stream.Duplex = crypto.createHash('sha1');
    hash.setEncoding('hex');

    stream.on('end', () => {
      hash.end();
      resolve(hash.read().toString());
    });
    stream.on('error', reject);
    hash.on('error', reject);

    stream.pipe(hash);
  });
}

export const mkdirPromise = Bluebird.promisify(fs.mkdir);
export const mkdirpPromise = Bluebird.promisify(mkdirp);
export const readdirPromise = Bluebird.promisify(fs.readdir);
export const readFilePromise = Bluebird.promisify(fs.readFile);
export const writeFilePromise = Bluebird.promisify(fs.writeFile);
