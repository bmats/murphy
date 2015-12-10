import * as fs from 'fs';
import * as MockFs from 'mock-fs';
import Config from '../../src/engine/Config';
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
      Config.load((err, config) => {
        expect(err).toBeUndefined();
        expect(config.sources.length).toBe(0);
        done();
      });
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
        ]
      };
      MockFs({
        [Config.fileName]: JSON.stringify(data)
      });

      Config.load((err, config) => {
        expect(err).toBeUndefined();
        expect(config).not.toBeUndefined();
        expect(config.sources.length).toBe(data.sources.length);

        config.sources.forEach((source, i) => {
          expect(source).toEqual(jasmine.any(Source));
          expect(source.name).toBe(data.sources[i].name);
          expect(source.paths).toEqual(data.sources[i].paths);
        });
        done();
      });
    });

    it('fails with invalid data', (done) => {
      MockFs({
        [Config.fileName]: 'invalid JSON goes here'
      });

      Config.load((err, config) => {
        expect(err).not.toBeUndefined();
        expect(config).toBeUndefined();
        done();
      });
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
        ]
      };

      const config = new Config();
      expectedData.sources.forEach(s => config.addSource(new Source(s.name, s.paths)));

      fs.readFile(Config.fileName, { encoding: 'utf8' }, (err, data) => {
        expect(err).toBeFalsy();
        expect(data).toBe(JSON.stringify(expectedData));
        done();
      });
    });
  });
});
