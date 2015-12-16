import * as fs from 'fs';
import * as MockFs from 'mock-fs';
import * as MockDate from 'mockdate';
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
    const archivePath = 'Archive';
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
      const readme = fs.statSync(archivePath + '/READ ME.txt');
      expect(readme.isFile()).toBe(true);
      const content = fs.readFileSync(archivePath + '/READ ME.txt');
      expect(readme.size).toBeGreaterThan(0);
    });

    it('creates archive folders', () => {
      const latest = fs.statSync(archivePath + '/Latest');
      expect(latest.isDirectory()).toBe(true);

      const versions = fs.statSync(archivePath + '/Versions');
      expect(versions.isDirectory()).toBe(true);
    });

    it('fails when the folder exists', (done) => {
      const existingFolder = 'Existing';
      fs.mkdirSync(existingFolder);
      const archive = new FilesystemArchive('Test Archive', existingFolder);
      archive.init()
        .then(() => fail('Expected error'))
        .catch((err) => expect(err).not.toBeUndefined())
        .then(done);
    });
  });

  describe('.rebuild()', () => {
    beforeEach(() => {
      MockFs({
        Archive: {
          Latest: {},
          Versions: {
            '2000-01-01 00-00-00': {
              '.index': 'source: My Computer\nfiles:\n  folder/file1.txt: add\n  folder/file2.txt: add\n  folder/file3.txt: add\n  folder/file5.txt: add\n',
              folder: {
                'file1.txt': 'file1 2000',
                'file2.txt': 'file2 2000',
                'file3.txt': 'file3 2000',
                'file5.txt': 'file5 2000'
              }
            },
            '2001-01-01 00-00-00': {
              '.index': 'source: My Computer\nfiles:\n  folder/file2.txt: modify\n  folder/file3.txt: delete\n  folder/file4.txt: add\n  folder/file5.txt: delete',
              folder: {
                'file2.txt': 'file2 2001',
                'file4.txt': 'file4 2001'
              }
            },
            '2002-01-01 00-00-00': {
              '.index': 'source: My Computer\nfiles:\n  folder/file2.txt: modify\n  folder/file3.txt: add\n',
              folder: {
                'file2.txt': 'file2 2002',
                'file3.txt': 'file3 2002'
              }
            }
          }
        }
      });
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('builds the latest folder', (done) => {
      const archive = new FilesystemArchive('Test Archive', 'Archive');
      archive.rebuild()
        .then(() => {
          expect(fs.lstatSync('Archive/Latest/folder/file1.txt').isSymbolicLink()).toBe(true);
          expect(fs.readlinkSync('Archive/Latest/folder/file1.txt'))
            .toBe('Archive/Versions/2000-01-01 00-00-00/folder/file1.txt');
          expect(fs.lstatSync('Archive/Latest/folder/file2.txt').isSymbolicLink()).toBe(true);
          expect(fs.readlinkSync('Archive/Latest/folder/file2.txt'))
            .toBe('Archive/Versions/2002-01-01 00-00-00/folder/file2.txt');
          expect(fs.lstatSync('Archive/Latest/folder/file3.txt').isSymbolicLink()).toBe(true);
          expect(fs.readlinkSync('Archive/Latest/folder/file3.txt'))
            .toBe('Archive/Versions/2002-01-01 00-00-00/folder/file3.txt');
          expect(fs.lstatSync('Archive/Latest/folder/file4.txt').isSymbolicLink()).toBe(true);
          expect(fs.readlinkSync('Archive/Latest/folder/file4.txt'))
            .toBe('Archive/Versions/2001-01-01 00-00-00/folder/file4.txt');
          expect(() => fs.lstatSync('Archive/Latest/folder/file5.txt')).toThrow(); // does not exist
        })
        .catch(err => fail(err))
        .then(done);
    });
  });

  describe('.createVersion()', () => {
    const archivePath = 'Archive';

    beforeEach(() => {
      MockFs({
        [archivePath + '/Versions']: {}
      });
      MockDate.set(new Date(2018, 0, 11, 5, 0, 0));
    });

    afterEach(() => {
      MockFs.restore();
      MockDate.reset();
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

    it('creates a version which is returned in getVersions()', (done) => {
      const archive = new FilesystemArchive('Test Archive', archivePath);
      let newVersion: FilesystemArchiveVersion;
      archive.createVersion()
        .then(version => { newVersion = version })
        .then(archive.getVersions.bind(archive))
        .then(versions => expect(versions).toContain(newVersion))
        .catch(err => fail(err))
        .then(done);
    });

    it('adds created version to ArchiveVersion cache', (done) => {
      const archive = new FilesystemArchive('Test Archive', archivePath);
      let newVersion: FilesystemArchiveVersion;
      archive.getVersions() // cache initial versions
      .then(archive.createVersion.bind(archive))
        .then(version => { newVersion = version })
        .then(archive.getVersions.bind(archive))
        .then(versions => expect(versions[0]).toBe(newVersion))
        .catch(err => fail(err))
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

    // Create a map with each folder and an index file inside
    const folders: any = folderNames.reduce((map, file) => {
      map[file] = {
        '.index': 'source: My Computer\nindex:\n'
      };
      return map;
    }, {});

    beforeEach(() => {
      MockFs({
        'Archive/Versions': folders
      });
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('lists archive folders', (done) => {
      const archive = new FilesystemArchive('Test Archive', 'Archive');
      archive.getVersions()
        .then(versions => {
          const dates = versions.map(v => v.folderName);
          expect(dates).toEqual(folderNames);

          // Check that each version is loaded by getting its files
          return Promise.all(versions.map(version =>
            version.getFiles()
              .then(files => expect(files).toBeTruthy())
          ));
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
