import fs from 'fs';
import {sep as DIRSEP} from 'path';
import MockFs from 'mock-fs';
import MockDate from 'mockdate';
import Archive from '../../../src/engine/Archive';
import FilesystemArchive from '../../../src/engine/fs/FilesystemArchive';
import FilesystemArchiveVersion from '../../../src/engine/fs/FilesystemArchiveVersion';

describe('FilesystemArchive', () => {

  describe('.path', () => {
    it('returns the path', () => {
      const path = 'path/to/folder';
      const archive = new FilesystemArchive('Archive Name', path);
      expect(archive.path).toBe(path);
    });
  });

  describe('.init()', () => {
    const archivePath = 'archive';
    beforeAll((done) => {
      MockFs({});
      const archive = new FilesystemArchive('Test Archive', archivePath);
      archive.init()
        .then(done);
    });

    afterAll(() => {
      MockFs.restore();
    });

    it('creates a root folder', () => {
      const rootStats = fs.statSync(archivePath);
      expect(rootStats.isDirectory()).toBe(true);
    });

    it('creates a readme', () => {
      const readme = fs.statSync(archivePath + DIRSEP + 'READ ME.txt');
      expect(readme.isFile()).toBe(true);
      const content = fs.readFileSync(archivePath + DIRSEP + 'READ ME.txt');
      expect(readme.size).toBeGreaterThan(0);
    });

    it('creates archive folders', () => {
      const latest = fs.statSync(archivePath + DIRSEP + 'Latest');
      expect(latest.isDirectory()).toBe(true);

      const versions = fs.statSync(archivePath + DIRSEP + 'Versions');
      expect(versions.isDirectory()).toBe(true);
    });

    it('fails when the folder exists', () => {
      const existingFolder = 'existing';
      fs.mkdirSync(existingFolder);
      const archive = new FilesystemArchive('Test Archive', existingFolder);
      archive.init()
        .then(() => fail('Expected error'))
        .catch((err) => expect(err).not.toBeUndefined());
    });
  });

  describe('.rebuild()', () => {
    // TODO: add specs
  });

  describe('.createVersion()', () => {
    const archivePath = 'archive';

    beforeEach(() => {
      MockFs({
        [archivePath + DIRSEP + 'Versions']: {}
      });
      MockDate.set(new Date(2018, 0, 11, 5, 0, 0));
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('returns a ArchiveVersion with the current date', (done) => {
      const archive = new FilesystemArchive('Test Archive', archivePath);
      archive.createVersion()
        .then(version => {
          expect(version).not.toBeUndefined();
          expect(version.date).toEqual(new Date());
        })
        .catch(err => fail(err))
        .then(done);
    });

    it('creates a folder', (done) => {
      const archive = new FilesystemArchive('Test Archive', archivePath);
      archive.createVersion()
        .then(() => {
          const stat = fs.statSync(archivePath + DIRSEP + 'Versions' + DIRSEP + '2018-01-11 05-00-00');
          expect(stat.isDirectory()).toBe(true);
        })
        .catch(err => fail(err))
        .then(done);
    });

    it('fails when the folder already exists', (done) => {
      MockFs({
        [archivePath + DIRSEP + 'Versions' + DIRSEP + '2018-01-11 05-00-00']: {}
      });
      const archive = new FilesystemArchive('Test Archive', archivePath);
      archive.createVersion()
        .then(version => fail('Expected error'))
        .catch(err => expect(err).not.toBeUndefined())
        .then(done);
    });
  });

  describe('.getVersions()', () => {
    const folderNames = [
      '2018-01-11 05-00-00', // descending date order
      '2017-03-04 12-34-56',
      '2016-01-02 11-22-33',
      '2015-12-05 01-20-33'
    ];

    // Create a map with each folder as key and {} as value
    const folders = folderNames.reduce((map, file) => {
      map[file] = {};
      return map;
    }, {});

    beforeEach(() => {
      MockFs({
        'archive/Versions': folders
      });
    });

    it('lists archive folders', (done) => {
      const archive = new FilesystemArchive('Test Archive', 'archive');
      archive.getVersions()
        .then(versions => {
          const dates = versions.map(v => v.folderName);
          expect(dates).toEqual(folderNames);
        })
        .catch(err => fail(err))
        .then(done);
    });
  });

  describe('.serialize() and .unserialize()', () => {
    it('should match', () => {
      const archive = new FilesystemArchive('Archive Name', 'path/to/folder');
      const clone = Archive.unserialize(archive.serialize());
      expect(clone instanceof FilesystemArchive).toBe(true);
      expect(clone).toEqual(archive);
    });
  });
});
