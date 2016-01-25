import * as crypto from 'crypto';
import * as fs from 'fs';
import * as stream from 'stream';
import * as yaml from 'js-yaml';
import * as MockFs from 'mock-fs';
const MockDate = require('mockdate');
import FilesystemArchiveVersion from '../../../src/engine/fs/FilesystemArchiveVersion';

describe('FilesystemArchiveVersion', () => {

  beforeEach(() => {
    MockDate.set(new Date(2018, 0, 11, 5, 0, 0));
  });

  afterEach(() => {
    MockDate.reset();
  });

  describe('.folderName', () => {
    it('returns the calculated folder name', () => {
      const date = new Date();
      const version = new FilesystemArchiveVersion(date, 'archive');
      expect(version.folderName).toBe('2018-01-11 05-00-00');
    });
  });

  describe('.source', () => {
    beforeEach(() => {
      MockFs({
        'Archive/Versions/2018-01-11 05-00-00/.index': 'source: My Computer\n'
      })
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('returns the loaded source', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => expect(version.source).toBe('My Computer'))
        .catch(err => fail(err))
        .then(done);
    });
  });

  describe('.init()', () => {
    const archivePath = 'Archive';
    beforeEach(() => {
      MockFs({
        [archivePath + '/Versions']: {}
      })
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('creates a folder', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), archivePath);
      version.init()
        .then(() => {
          const stat = fs.statSync(archivePath + '/Versions/2018-01-11 05-00-00');
          expect(stat.isDirectory()).toBe(true);
        })
        .catch(err => fail(err))
        .then(done);
    });

    it('creates a base YAML index file with source and index', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), archivePath);
      version.init()
        .then(() => {
          const stat = fs.statSync(archivePath + '/Versions/2018-01-11 05-00-00/.index');
          expect(stat.isFile()).toBe(true);

          const contents = fs.readFileSync(archivePath + '/Versions/2018-01-11 05-00-00/.index', { encoding: 'utf8' });
          const data = yaml.safeLoad(contents);
          expect(data.source).toBe(require('os').hostname());
          expect(data.add).not.toBeUndefined(); // will be null when empty
          expect(data.modify).not.toBeUndefined();
          expect(data.delete).not.toBeUndefined();
        })
        .catch(err => fail(err))
        .then(done);
    });

    it('sets its source and index', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), archivePath);
      version.init()
        .then(() => expect(version.source).toBeTruthy())
        .then(() => version.getFiles())
        .then(files => expect(files).toBeTruthy())
        .catch(err => fail(err))
        .then(done);
    });

    it('fails when the folder already exists', (done) => {
      MockFs({
        [archivePath + '/Versions/2018-01-11 05-00-00']: {}
      });
      const archive = new FilesystemArchiveVersion(new Date(), archivePath);
      archive.init()
        .then(() => fail('Expected error'))
        .catch(err => expect(err).not.toBeUndefined())
        .then(done);
    });
  });

  describe('.load()', () => {
    beforeEach(() => {
      MockFs({
        'Archive/Versions/2018-01-11 05-00-00/.index':
          'source: My Computer\nadd:\n  file1.txt: abc123\nmodify:\n  folder/photo.jpg: abc123\ndelete:\n  yolo.txt:\n'
      })
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('sets the source and index', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => expect(version.source).toBe('My Computer'))

        .then(() => version.getFiles())
        .then(files => expect(files).toEqual(['file1.txt', 'folder/photo.jpg', 'yolo.txt']))

        .then(() => version.getFileStatus('file1.txt'))
        .then(status => expect(status).toBe('add'))
        .then(() => version.getFileStatus('folder/photo.jpg'))
        .then(status => expect(status).toBe('modify'))
        .then(() => version.getFileStatus('yolo.txt'))
        .then(status => expect(status).toBe('delete'))

        .catch(err => fail(err))
        .then(done);
    });
  });

  describe('.getFiles()', () => {
    beforeEach(() => {
      MockFs({
        'Archive/Versions/2018-01-11 05-00-00/.index':
          'source: My Computer\nadd:\n  file1.txt: abc123\nmodify:\n  folder/photo.jpg: abc123\ndelete:\n  yolo.txt:\n'
      })
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('gets the list of files from the index', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.getFiles())
        .then(files => expect(files).toEqual(['file1.txt', 'folder/photo.jpg', 'yolo.txt']))
        .catch(err => fail(err))
        .then(done);
    });
  });

  describe('.getFileStatus()', () => {
    beforeEach(() => {
      MockFs({
        'Archive/Versions/2018-01-11 05-00-00/.index':
          'source: My Computer\nadd:\n  file1.txt: abc123\n'
      })
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('gets a file status from the index', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.getFileStatus('file1.txt'))
        .then(status => expect(status).toBe('add'))
        .catch(err => fail(err))
        .then(done);
    });

    it('returns undefined if the file is not in the index', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.getFileStatus('bad_file.txt'))
        .then(status => expect(status).toBeUndefined())
        .catch(err => fail(err))
        .then(done);
    });
  });

  describe('.writeFile()', () => {
    const contents = 'The quick brown fox jumps over the lazy dog';

    beforeEach(() => {
      MockFs({
        'Archive/Versions/2018-01-11 05-00-00/.index': 'source: My Computer\n'
      });
    });

    afterEach(() => {
      MockFs.restore();
    });

    function testWriteFile(file: string, status: string) {
      return (done) => {
        const version = new FilesystemArchiveVersion(new Date(), 'Archive');

        const contents = `The ${status} brown fox jumps over the lazy dog`;
        const readStream = new stream.Readable();
        readStream._read = () => {};
        readStream.push(contents);
        readStream.push(null);

        const hash = crypto.createHash('sha1').update(contents).digest('hex');

        version.load()
          .then(() => version.writeFile(file, status, readStream, hash))
          .then(() => version.getFileStatus(file))
          .then(s => expect(s).toBe(status))
          .then(() => version.getFileChecksum(file))
          .then(c => expect(c).toBe(hash))
          .then(() => {
            const stream = version.createReadStream(file);
            let data = '';
            stream.on('data', chunk => data += chunk);

            stream.on('end', () => {
              expect(data).toBe(contents);
              done();
            });
            stream.on('error', err => fail(err));
          })
          .catch(err => fail(err));
      };
    }

    it('writes new file to version and adds to index', testWriteFile('folder1/file_added.txt', 'add'));
    it('writes modified file to version and adds to index', testWriteFile('folder2/file_modified.txt', 'modify'));

    it('adds deleted file in index', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.writeFile('folder3/file_deleted.txt', 'delete'))
        .then(() => version.getFileStatus('folder3/file_deleted.txt'))
        .then(status => expect(status).toBe('delete'))
        .then(() => expect(
          fs.statSync('Archive/Versions/2018-01-11 05-00-00/folder3/file_deleted.txt.deleted')
            .size).toBe(0)) // exists and empty
        .catch(err => fail(err))
        .then(done);
    });

    it('creates subdirectories as needed', (done) => {
      const emptyStream = new stream.Readable();
      emptyStream._read = () => {};
      emptyStream.push(null);

      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.writeFile('this/is/a/pretty/deep/file.txt', 'add', emptyStream, 'da39a3ee5e6b4b0d3255bfef95601890afd80709'))
        .catch(err => fail(err))
        .then(done);
    });

    it('fails if stream and checksum not passed with add/modify mode', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.writeFile('file_added.txt', 'add'))
        .then(() => fail('Expected error'))
        .catch(err => expect(err).not.toBeUndefined())
        .then(() => version.writeFile('file_modified.txt', 'modify'))
        .then(() => fail('Expected error'))
        .catch(err => expect(err).not.toBeUndefined())
        .then(done);
    });

    it('fails with invalid file mode', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.writeFile('nonsense.txt', 'blah'))
        .then(() => fail('Expected error'))
        .catch(err => expect(err).not.toBeUndefined())
        .then(done);
    });
  });

  describe('.createReadStream()', () => {
    const contents = 'The quick brown fox jumps over the lazy dog';

    beforeAll(() => {
      MockFs({
        'Archive/Versions/2018-01-11 05-00-00': {
          '.index': 'source: My Computer\nadd:\n  folder/file.txt: 2fd4e1c67a2d28fced849ee1bb76e7391b93eb12\n',
          folder: {
            'file.txt': contents
          }
        }
      });
    });

    afterAll(() => {
      MockFs.restore();
    });

    it('returns a valid stream', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => {
          const stream = version.createReadStream('folder/file.txt');

          let data = '';
          stream.on('data', chunk => data += chunk);

          stream.on('end', () => {
            expect(data).toBe(contents);
            done();
          });
          stream.on('error', err => fail(err));
        })
        .catch(err => fail(err));
    });

    it('returns null if the file is not in the index', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => {
          const stream = version.createReadStream('invalid/path.txt');
          expect(stream).toBeNull();
          done();
        })
        .catch(err => fail(err));
    });

    it('throttles file opens', (done) => {
      const FILE_COUNT = 15555;
      const MAX_FILES_OPEN = 100; // set on filequeue
      const FILE_OPEN_WAIT = 1; // ms

      const files = new Array(FILE_COUNT);
      for (let i = 0; i < FILE_COUNT; ++i) {
        files[i] = `file${i}.txt`;
      }

      const filesystem: any = {
        'Archive/Versions/2018-01-11 05-00-00': {
          '.index': 'source: My Computer\nadd:\n' + files.reduce((str, file) => str += `  ${file}: da39a3ee5e6b4b0d3255bfef95601890afd80709\n`, '')
        }
      };
      files.forEach(file => filesystem['Archive/Versions/2018-01-11 05-00-00'][file] = '');
      MockFs(filesystem);

      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      const streams = new Array(FILE_COUNT);

      const openFiles = [];
      let filesOpenedCount = 0;
      function addToOpenFiles() {
        openFiles.push(this);
      }

      function checkForOpenedFiles() {
        expect(openFiles.length).toBe(Math.min(FILE_COUNT - filesOpenedCount, MAX_FILES_OPEN));
        filesOpenedCount += openFiles.length;

        openFiles.forEach(stream => stream.destroy());
        openFiles.length = 0;

        if (filesOpenedCount < FILE_COUNT) {
          setTimeout(checkForOpenedFiles, FILE_OPEN_WAIT);
        } else {
          done();
        }
      }

      version.load()
        .then(() => {
          for (let i = 0; i < FILE_COUNT; ++i) {
            streams[i] = version.createReadStream(`file${i}.txt`);
            streams[i].on('open', addToOpenFiles.bind(streams[i]));
          }
          setTimeout(checkForOpenedFiles, FILE_OPEN_WAIT);
        });
    });
  });

  describe('.getFileChecksum()', () => {
    beforeEach(() => {
      MockFs({
        'Archive/Versions/2018-01-11 05-00-00': {
          '.index': 'source: My Computer\nadd:\n  folder/file.txt: thiswasnotcomputed\n',
          folder: {
            'file.txt': 'The quick brown fox jumps over the lazy dog'
          }
        }
      });
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('gets the SHA1 from the index', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.getFileChecksum('folder/file.txt'))
        .then(checksum => expect(checksum).toBe('thiswasnotcomputed'))
        .catch(err => fail(err))
        .then(done);
    });

    it('returns undefined if the file is not in the index', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.getFileChecksum('bad_file.txt'))
        .then(checksum => expect(checksum).toBeUndefined())
        .catch(err => fail(err))
        .then(done);
    });
  });

  describe('.apply()', () => {
    beforeEach(() => {
      MockFs({
        'Archive/Versions/2018-01-11 05-00-00': {
          '.index': 'source: My Computer\nadd:\n  folder/file.txt: 8f93542443e98f41fe98e97d6d2a147193b1b005\n',
          folder: {
            'file.txt': 'test file'
          }
        }
      });
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('writes a YAML index file with source and index', (done) => {
      const emptyStream = new stream.Readable();
      emptyStream._read = () => {};
      emptyStream.push(null);

      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.writeFile('Pictures/grumpycat.jpg', 'modify', emptyStream, 'da39a3ee5e6b4b0d3255bfef95601890afd80709'))
        .then(() => version.writeFile('folder/deleted.txt', 'delete'))
        .then(version.apply.bind(version))
        .then(() => {
          const contents = fs.readFileSync('Archive/Versions/2018-01-11 05-00-00/.index', { encoding: 'utf8' });
          const data = yaml.safeLoad(contents);
          expect(data.source).toBe('My Computer');
          expect(data.add).toEqual({
            'folder/file.txt': '8f93542443e98f41fe98e97d6d2a147193b1b005'
          });
          expect(data.modify).toEqual({
            'Pictures/grumpycat.jpg': 'da39a3ee5e6b4b0d3255bfef95601890afd80709'
          });
          expect(data.delete).toEqual({
            'folder/deleted.txt': ''
          });
        })
        .catch(err => fail(err))
        .then(done);
    });
  });

  describe('::fromFolderName()', () => {
    it('parses the folder date', () => {
      const folder = '2018-01-11 05-00-00';
      const version = FilesystemArchiveVersion.fromFolderName(folder, 'Archive');
      expect(version.folderName).toBe(folder); // .folderName is reformatted
    });
  });

  describe('::parseIndexFile()', () => {
    it('parses a standard file', () => {
      const data = {
        add: {
          'file.txt': '356a192b7913b04c54574d18c28d46e6395428ab',
          'folder/file2.txt': 'da4b9237bacccdf19c0760cab7aec4a8359010b0',
        },
        modify: {
          'file3.txt': '77de68daecd823babbb58edb1c8e14d7106e83bb',
          'folder/file4.txt': '1b6453892473a467d07372d45eb05abc2031647a',
        },
        delete: {
          'file5.txt': '',
          'folder/file6.txt': '',
        }
      };
      const output = FilesystemArchiveVersion.parseIndexFile(data);
      expect(output).toEqual({
        'file.txt': { status: 'add', checksum: data.add['file.txt'] },
        'folder/file2.txt': { status: 'add', checksum: data.add['folder/file2.txt'] },
        'file3.txt': { status: 'modify', checksum: data.modify['file3.txt'] },
        'folder/file4.txt': { status: 'modify', checksum: data.modify['folder/file4.txt'] },
        'file5.txt': { status: 'delete', checksum: '' },
        'folder/file6.txt': { status: 'delete', checksum: '' }
      });
    });
  });

  describe('::buildIndexFile()', () => {
    it('builds the correct format', () => {
      const index: { [file: string]: { status: string; checksum: string; } } = {
        'file.txt': { status: 'add', checksum: '356a192b7913b04c54574d18c28d46e6395428ab' },
        'folder/file2.txt': { status: 'add', checksum: 'da4b9237bacccdf19c0760cab7aec4a8359010b0' },
        'file3.txt': { status: 'modify', checksum: '77de68daecd823babbb58edb1c8e14d7106e83bb' },
        'folder/file4.txt': { status: 'modify', checksum: '1b6453892473a467d07372d45eb05abc2031647a' },
        'file5.txt': { status: 'delete', checksum: '' },
        'folder/file6.txt': { status: 'delete', checksum: '' }
      };

      const output = {};
      FilesystemArchiveVersion.buildIndexFile(output, index);
      expect(output).toEqual({
        add: {
          'file.txt': index['file.txt'].checksum,
          'folder/file2.txt': index['folder/file2.txt'].checksum,
        },
        modify: {
          'file3.txt': index['file3.txt'].checksum,
          'folder/file4.txt': index['folder/file4.txt'].checksum,
        },
        delete: {
          'file5.txt': '',
          'folder/file6.txt': '',
        }
      });
    });
  });
});
