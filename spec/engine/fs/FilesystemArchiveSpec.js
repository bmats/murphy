import fs from 'fs';
import mockFs from 'mock-fs';
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
    beforeEach(() => {
      mockFs({
      });
    });

    afterEach(() => {
      mockFs.restore();
    });

    // TODO: add specs
  });

  describe('.rebuild()', () => {
    // TODO: add specs
  });

  describe('.createVersion()', () => {
    // TODO: add specs
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
