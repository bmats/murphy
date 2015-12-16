import * as crypto from 'crypto';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as stream from 'stream';
import * as Promise from 'bluebird';

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

export const mkdirAsync     = Promise.promisify(fs.mkdir);
export const mkdirpAsync    = Promise.promisify(mkdirp);
export const readdirAsync   = Promise.promisify(fs.readdir);
export const readFileAsync  = Promise.promisify(fs.readFile);
export const symlinkAsync   = Promise.promisify(fs.symlink);
export const writeFileAsync = Promise.promisify(fs.writeFile);