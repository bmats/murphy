import * as MockFs from 'mock-fs';
import Source from '../../src/engine/Source';

describe('Source', () => {

  describe('.name', () => {
    it('returns the name', () => {
      const name = 'Source Name';
      const source = new Source(name, []);
      expect(source.name).toBe(name);
    });
  });

  describe('.paths', () => {
    it('returns the paths', () => {
      const paths = ['path1', 'path/2', 'path/3.txt'];
      const source = new Source('', paths);
      expect(source.paths).toEqual(paths);
    });
  });

  describe('.getFiles()', () => {
    const files = [
      '/root.txt',
      '/Documents/file1.txt',
      '/Documents/file2.txt',
      '/Documents/Folder1/file3.txt',
      '/Documents/Folder1/file4.txt',
      '/Documents/Folder1/Folder2/file5.txt',
      '/Documents/Folder1/Folder2/Folder3/file6.txt',
      '/Pictures/photo1.jpg',
      '/Pictures/Album/photo2.jpg',
      '/Videos/cats.mp4'
    ];

    // Create a map with each file as key and '' as value
    const filesystem: any = files.reduce((map, file) => {
      map[file] = '';
      return map;
    }, {});

    beforeEach(() => {
      MockFs(filesystem);
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('enumerates a single folder correctly', (done) => {
      const source = new Source('Test Source', ['/Documents']);
      source.getFiles()
        .then(result => expect(result).toEqualInAnyOrder([
          'file1.txt',
          'file2.txt',
          'Folder1/file3.txt',
          'Folder1/file4.txt',
          'Folder1/Folder2/file5.txt',
          'Folder1/Folder2/Folder3/file6.txt'
        ]))
        .catch(err => fail(err))
        .then(done);
    });

    it('enumerates multiple folders correctly', (done) => {
      const source = new Source('Test Source', ['/Documents', '/Pictures']);
      source.getFiles()
        .then(result => expect(result).toEqualInAnyOrder([
          'Documents/file1.txt',
          'Documents/file2.txt',
          'Documents/Folder1/file3.txt',
          'Documents/Folder1/file4.txt',
          'Documents/Folder1/Folder2/file5.txt',
          'Documents/Folder1/Folder2/Folder3/file6.txt',
          'Pictures/photo1.jpg',
          'Pictures/Album/photo2.jpg'
        ]))
        .catch(err => fail(err))
        .then(done);
    });
  });

  describe('.createReadStream()', () => {
    const contents = 'The quick brown fox jumps over the lazy dog';

    afterEach(() => {
      MockFs.restore();
    });

    it('returns a valid stream', (done) => {
      MockFs({
        'folder/file.txt': contents
      });

      const source = new Source('Test Source', ['folder']);
      const stream = source.createReadStream('file.txt');

      let data = '';
      stream.on('data', chunk => data += chunk);

      stream.on('end', () => {
        expect(data).toBe(contents);
        done();
      });
      stream.on('error', err => fail(err));
    });

    it('throttles file opens', (done) => {
      const FILE_COUNT = 15555;
      const MAX_FILES_OPEN = 100; // set on filequeue
      const FILE_OPEN_WAIT = 1; // ms

      const filesystem: any = {};
      for (let i = 0; i < FILE_COUNT; ++i) {
        filesystem[`/file${i}.txt`] = `file ${i}`;
      }
      MockFs(filesystem);

      const source = new Source('Test Source', ['/']);
      const streams = new Array(FILE_COUNT);

      const openFiles = [];
      let filesOpenedCount = 0;
      function addToOpenFiles() {
        openFiles.push(this);
      }

      for (let i = 0; i < FILE_COUNT; ++i) {
        streams[i] = source.createReadStream(`/file${i}.txt`);
        streams[i].on('open', addToOpenFiles.bind(streams[i]));
      }

      function checkForOpenedFiles() {
        expect(openFiles.length).toBe(Math.min(FILE_COUNT - filesOpenedCount, MAX_FILES_OPEN));
        filesOpenedCount += openFiles.length;

        openFiles.forEach(stream => stream.destroy());

        if (filesOpenedCount < FILE_COUNT) {
          if (openFiles.length > 0) {
            openFiles.length = 0;
            setTimeout(checkForOpenedFiles, FILE_OPEN_WAIT);
          } else {
            fail('No files opened.');
          }
        } else {
          done();
        }
      }

      setTimeout(checkForOpenedFiles, FILE_OPEN_WAIT);
    });
  });

  describe('.getFileChecksum()', () => {
    beforeEach(() => {
      MockFs({
        'folder/file.txt': 'The quick brown fox jumps over the lazy dog'
      });
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('computes correct SHA1', (done) => {
      const source = new Source('Test Source', ['folder']);
      source.getFileChecksum('file.txt')
        .then(checksum => expect(checksum).toBe('2fd4e1c67a2d28fced849ee1bb76e7391b93eb12'))
        .catch(err => fail(err))
        .then(done);
    });

    it('fails with folder', (done) => {
      const source = new Source('Test Source', []);
      source.getFileChecksum('folder')
        .then(checksum => fail('Expected error'))
        .catch(err => expect(err).not.toBeUndefined())
        .then(done);
    });

    it('fails with invalid file', (done) => {
      const source = new Source('Test Source', []);
      source.getFileChecksum('invalid/file.txt')
        .then(checksum => fail('Expected error'))
        .catch(err => expect(err).not.toBeUndefined())
        .then(done);
    });
  });

  describe('.serialize() and .unserialize()', () => {
    it('should match', () => {
      const source = new Source('Source Name', ['path1', 'path/2', 'path/3.txt']);
      const clone = Source.unserialize(source.serialize());
      expect(clone).toEqual(source);
    });
  });

  describe('::_findCommonRootDir()', () => {
    it('returns an empty string for no paths', () => {
      expect(Source._findCommonRootDir([])).toBe('');
    });

    it('returns the path for one path', () => {
      const file = 'path/to/a/file.txt';
      expect(Source._findCommonRootDir([file])).toBe(file);
    });

    it('works for paths with a root directory', () => {
      const paths = [
        '/path/to/a/file.txt',
        '/path/to/another/cool/file.txt',
        '/path/to/a/folder',
      ];
      expect(Source._findCommonRootDir(paths)).toBe('/path/to');
    });

    it('works for paths from the current directory', () => {
      const paths = [
        'path/to/a/file.txt',
        'path/to/another/cool/file.txt',
        'path/to/a/folder'
      ];
      expect(Source._findCommonRootDir(paths)).toBe('path/to');
    });

    it('works for different length paths', () => {
      const paths = [
        'path/to/a/file.txt',
        'path/to/another/cool/file.txt',
        'path'
      ];
      expect(Source._findCommonRootDir(paths)).toBe('path');
    });

    it('works for no common roots', () => {
      const paths = [
        'path/to/a/file.txt',
        'another/path'
      ];
      expect(Source._findCommonRootDir(paths)).toBe('');
    });

    it('works on paths ending with "/"', () => {
      const paths = [
        'path/to/a/folder/',
        'path/to/something',
        'path/to/'
      ];
      expect(Source._findCommonRootDir(paths)).toBe('path/to');
    });
  });

  describe('::_removeRootDirFromPath()', () => {
    it('removes correct prefix', () => {
      const path = 'path/to/a/file.txt';
      expect(Source._removeRootDirFromPath(path, 'path/to')).toBe('a/file.txt');
    });

    it('does not change non-matching paths', () => {
      const path = 'path/to/a/file.txt';
      expect(Source._removeRootDirFromPath(path, 'root/dir')).toBe(path);
    });

    it('works with root path ending with "/"', () => {
      const path = 'path/to/a/file.txt';
      expect(Source._removeRootDirFromPath(path, 'path/to/')).toBe('a/file.txt');
    });
  });
});
