import * as fs from 'fs';
import * as MockFs from 'mock-fs';
import Config from '../../src/engine/Config';
import Archive from '../../src/engine/Archive';
import FilesystemArchive from '../../src/engine/fs/FilesystemArchive';
import Source from '../../src/engine/Source';

describe('Config', () => {

  beforeEach(() => {
    MockFs({});
  });

  afterEach(() => {
    MockFs.restore();
  });

  describe('::load()', () => {
    it('works without a config file', (done) => {
      Config.load()
        .then(config => expect(config.sources.length).toBe(0))
        .catch(err => fail(err))
        .then(done);
    });

    it('correctly loads a config file', (done) => {
      const data = {
        sources: [
          {
            name: 'Source 1',
            paths: ['path/to/dir', 'path/to/file.txt']
          },
          {
            name: 'Another Source',
            paths: ['some/path', 'nyan.gif']
          }
        ],
        archives: [
          {
            name: 'Some Archive',
            type: 'FilesystemArchive',
            path: 'path/to/Archive'
          },
          {
            name: 'Another Archive',
            type: 'FilesystemArchive',
            path: 'folder/with/Archive'
          }
        ],
        fileRegExps: ['[Cc]ache', '\\.DS_Store', '\\$RECYCLE.BIN'],
        ui: {
          isRegExpEnabled: true,
          someOtherData: 42
        }
      };
      MockFs({
        [Config.fileName]: JSON.stringify(data)
      });

      Config.load()
        .then(config => {
          expect(config).not.toBeUndefined();
          expect(config.sources.length).toBe(data.sources.length);

          config.sources.forEach((source, i) => {
            expect(source).toEqual(jasmine.any(Source));
            expect(source.name).toBe(data.sources[i].name);
            expect(source.paths).toEqual(data.sources[i].paths);
          });

          config.archives.forEach((archive: FilesystemArchive, i) => {
            expect(archive).toEqual(jasmine.any(FilesystemArchive));
            expect(archive.name).toBe(data.archives[i].name);
            expect(archive.path).toEqual(data.archives[i].path);
          });

          config.fileRegExps.forEach((regexp, i) => expect(regexp.source).toEqual(data.fileRegExps[i]));
          expect(config.ui).toEqual(data.ui);
        })
        .catch(err => fail(err))
        .then(done);
    });

    it('fails with invalid data', (done) => {
      MockFs({
        [Config.fileName]: 'invalid JSON goes here'
      });

      Config.load()
        .then(config => fail('Expected error'))
        .catch(err => expect(err).not.toBeUndefined())
        .then(done);
    });
  });

  describe('.addSource() and .sources', () => {
    it('adds a source to sources', () => {
      const config = new Config();
      expect(config.sources.length).toBe(0);

      const newSource = new Source('Added Source', ['a', 'b/b', 'c/c.c']);
      config.addSource(newSource);
      expect(config.sources.length).toBe(1);
      expect(config.sources[0].name).toBe(newSource.name);
      expect(config.sources[0].paths).toEqual(newSource.paths);
    });
  });

  describe('.addArchive() and .archives', () => {
    it('adds an archive to archives', () => {
      const config = new Config();
      expect(config.archives.length).toBe(0);

      const newArchive = new FilesystemArchive('Added Archive', 'path/to/Archive');
      config.addArchive(newArchive);
      expect(config.archives.length).toBe(1);
      expect(config.archives[0].name).toBe(newArchive.name);
      expect((<FilesystemArchive>config.archives[0]).path).toEqual(newArchive.path);
    });
  });

  describe('.fileRegExps', () => {
    it('gets and sets the regexps', () => {
      const config = new Config();

      const regexps = [/[Cc]ache/, /\.DS_Store/, /\$RECYCLE.BIN/];
      config.fileRegExps = regexps;
      expect(config.fileRegExps).toBe(regexps);
    });
  });

  describe('.ui', () => {
    it('gets and sets ui data', () => {
      const config = new Config();

      const data = {
        isRegExpEnabled: true,
        someOtherData: 42
      };
      config.ui = data;
      expect(config.ui).toBe(data);
    });
  });

  describe('.write()', () => {
    it('correctly writes a file', (done) => {
      const expectedData = {
        sources: [
          {
            name: 'Source 1',
            paths: ['path/to/dir', 'path/to/file.txt']
          },
          {
            name: 'Another Source',
            paths: ['some/path', 'nyan.gif']
          }
        ],
        archives: [
          {
            name: 'Some Archive',
            type: 'FilesystemArchive',
            path: 'path/to/Archive'
          },
          {
            name: 'Another Archive',
            type: 'FilesystemArchive',
            path: 'folder/with/Archive'
          }
        ],
        fileRegExps: ['[Cc]ache', '\\.DS_Store', '\\$RECYCLE\\.BIN'],
        ui: {
          isRegExpEnabled: true,
          someOtherData: 42
        }
      };

      const config = new Config();
      expectedData.sources.forEach(s => config.addSource(new Source(s.name, s.paths)));
      expectedData.archives.forEach(a => config.addArchive(new FilesystemArchive(a.name, a.path)));
      config.fileRegExps = expectedData.fileRegExps.map(pattern => new RegExp(pattern));
      config.ui = expectedData.ui;

      fs.readFile(Config.fileName, { encoding: 'utf8' }, (err, data) => {
        expect(err).toBeFalsy();
        expect(data).toBe(JSON.stringify(expectedData));
        done();
      });
    });
  });
});
