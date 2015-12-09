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
    beforeAll(() => {
      MockFs({});
      MockDate.set(new Date('2018-01-11T05:00:00'));
    });

    afterAll(() => {
      MockFs.restore();
    });

    it('returns a ArchiveVersion with the current time', (done) => {
      const archive = new FilesystemArchive('Test Archive', archivePath);
      archive.init();
      archive.createVersion()
        .then(fs.statSync(archivePath + DIRSEP + '2018-01-11 05-00-00'))
        .catch(err => expect(err).toBeUndefined())
        .then(done);
    });

    it('creates a folder', () => {
      // TODO: impl
    });

    it('errors if the folder already exists', () => {
      // TODO: impl
    });
  });

  describe('.getVersions()', () => {
    // TODO: add specs
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
