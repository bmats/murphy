import mockFs from 'mock-fs';
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
      '/Photos/photo1.jpg',
      '/Photos/Album/photo2.jpg',
      '/Videos/cats.mp4'
    ];

    // Create a map with each file as key and '' as value
    const filesystem = files.reduce((map, file) => {
      map[file] = '';
      return map;
    }, {});

    beforeEach(() => {
      mockFs(filesystem);
    });

    afterEach(() => {
      mockFs.restore();
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
        .catch(err => expect(err).toBeUndefined())
        .then(done);
    });

    it('enumerates multiple folders correctly', (done) => {
      const source = new Source('Test Source', ['/Documents', '/Photos']);
      source.getFiles()
        .then(result => expect(result).toEqualInAnyOrder([
          'Documents/file1.txt',
          'Documents/file2.txt',
          'Documents/Folder1/file3.txt',
          'Documents/Folder1/file4.txt',
          'Documents/Folder1/Folder2/file5.txt',
          'Documents/Folder1/Folder2/Folder3/file6.txt',
          'Photos/photo1.jpg',
          'Photos/Album/photo2.jpg'
        ]))
        .catch(err => expect(err).toBeUndefined())
        .then(done);
    });
  });

  describe('.createReadStream()', () => {
    const contents = 'The quick brown fox jumps over the lazy dog';

    beforeEach(() => {
      mockFs({
        'folder/file.txt': contents
      });
    });

    afterEach(() => {
      mockFs.restore();
    });

    it('returns a valid stream', (done) => {
      const source = new Source('Test Source', ['folder']);
      const stream = source.createReadStream('file.txt');

      let data = '';
      stream.on('data', chunk => data += chunk);

      stream.on('end', () => {
        expect(data).toBe(contents);
        done();
      });
      stream.on('error', (err) => {
        expect(err).toBeUndefined();
        done();
      });
    });
  });

  describe('.getFileChecksum()', () => {
    beforeEach(() => {
      mockFs({
        'folder/file.txt': 'The quick brown fox jumps over the lazy dog'
      });
    });

    afterEach(() => {
      mockFs.restore();
    });

    it('computes correct SHA1', (done) => {
      const source = new Source('Test Source', ['folder']);
      source.getFileChecksum('file.txt')
        .then(checksum => expect(checksum).toBe('2fd4e1c67a2d28fced849ee1bb76e7391b93eb12'))
        .catch(err => expect(err).toBeUndefined())
        .then(done);
    });

    it('errors with folder', (done) => {
      const source = new Source('Test Source', []);
      source.getFileChecksum('folder')
        .then(checksum => expect(checksum).toBeUndefined())
        .catch(err => expect(err).not.toBeUndefined())
        .then(done);
    });

    it('errors with invalid file', (done) => {
      const source = new Source('Test Source', []);
      source.getFileChecksum('invalid/file.txt')
        .then(checksum => expect(checksum).toBeUndefined())
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

  describe('::findCommonRootDir()', () => {
    it('returns an empty string for no paths', () => {
      expect(Source.findCommonRootDir([])).toBe('');
    });

    it('returns the path for one path', () => {
      const file = 'path/to/a/file.txt';
      expect(Source.findCommonRootDir([file])).toBe(file);
    });

    it('works for normal paths', () => {
      const paths = [
        'path/to/a/file.txt',
        'path/to/another/cool/file.txt',
        'path/to/a/folder'
      ];
      expect(Source.findCommonRootDir(paths)).toBe('path/to');
    });

    it('works for different length paths', () => {
      const paths = [
        'path/to/a/file.txt',
        'path/to/another/cool/file.txt',
        'path'
      ];
      expect(Source.findCommonRootDir(paths)).toBe('path');
    });

    it('works for no common roots', () => {
      const paths = [
        'path/to/a/file.txt',
        'another/path'
      ];
      expect(Source.findCommonRootDir(paths)).toBe('');
    });

    it('works on paths ending with "/"', () => {
      const paths = [
        'path/to/a/folder/',
        'path/to/something',
        'path/to/'
      ];
      expect(Source.findCommonRootDir(paths)).toBe('path/to');
    });
  });

  describe('::removeRootDirFromPath()', () => {
    it('does not do anything to non-matching paths', () => {
      const path = 'path/to/a/file.txt';
      expect(Source.removeRootDirFromPath(path, 'root/dir')).toBe(path);
    });

    it('works', () => {
      const path = 'path/to/a/file.txt';
      expect(Source.removeRootDirFromPath(path, 'path/to')).toBe('a/file.txt');
    });

    it('works with root path ending with "/"', () => {
      const path = 'path/to/a/file.txt';
      expect(Source.removeRootDirFromPath(path, 'path/to/')).toBe('a/file.txt');
    });
  });
});
