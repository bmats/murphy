import * as fs from 'fs';
import * as stream from 'stream';
import * as yaml from 'js-yaml';
import * as MockFs from 'mock-fs';
import * as MockDate from 'mockdate';
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
        'Archive/Versions/2018-01-11 05-00-00/.index': 'source: My Computer\nfiles:\n'
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
          expect(data.files).not.toBeUndefined(); // will be null when empty
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
          'source: My Computer\nfiles:\n  file1.txt: add\n  folder/photo.jpg: modify\n  yolo.txt: delete\n'
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
          'source: My Computer\nfiles:\n  file1.txt: add\n  folder/photo.jpg: modify\n  yolo.txt: delete\n'
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
          'source: My Computer\nfiles:\n  file1.txt: add\n'
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
  });

  describe('.writeFile()', () => {
    const contents = 'The quick brown fox jumps over the lazy dog';

    beforeEach(() => {
      MockFs({
        'Archive/Versions/2018-01-11 05-00-00/.index': 'source: My Computer\nfiles:\n'
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

        version.load()
          .then(() => version.writeFile(file, status, readStream))
          .then(() => version.getFileStatus(file))
          .then(s => expect(s).toBe(status))
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
        .then(() => version.writeFile('this/is/a/pretty/deep/file.txt', 'add', emptyStream))
        .catch(err => fail(err))
        .then(done);
    });

    it('fails if stream not passed with add/modify mode', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.writeFile('file_added.txt', 'add'))
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
          '.index': 'source: My Computer\nfiles:\n  folder/file.txt: add\n',
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
          '.index': 'source: My Computer\nfiles:\n' + files.reduce((str, file) => str += `  ${file}: add\n`, '')
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
          '.index': 'source: My Computer\nfiles:\n  folder/file.txt: add\n',
          folder: {
            'file.txt': 'The quick brown fox jumps over the lazy dog'
          }
        }
      });
    });

    afterEach(() => {
      MockFs.restore();
    });

    it('computes correct SHA1', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.getFileChecksum('folder/file.txt'))
        .then(checksum => expect(checksum).toBe('2fd4e1c67a2d28fced849ee1bb76e7391b93eb12'))
        .catch(err => fail(err))
        .then(done);
    });

    it('fails with invalid file', (done) => {
      const version = new FilesystemArchiveVersion(new Date(), 'Archive');
      version.load()
        .then(() => version.getFileChecksum('bad_file.txt'))
        .then(checksum => fail('Expected error'))
        .catch(err => expect(err).not.toBeUndefined())
        .then(done);
    });
  });

  describe('.apply()', () => {
    beforeEach(() => {
      MockFs({
        'Archive/Versions/2018-01-11 05-00-00': {
          '.index': 'source: My Computer\nfiles:\n  folder/file.txt: add\n',
          folder: {
            'file.txt': ''
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
        .then(() => version.writeFile('Pictures/grumpycat.jpg', 'modify', emptyStream))
        .then(() => version.writeFile('folder/deleted.txt', 'delete'))
        .then(version.apply.bind(version))
        .then(() => {
          const contents = fs.readFileSync('Archive/Versions/2018-01-11 05-00-00/.index', { encoding: 'utf8' });
          const data = yaml.safeLoad(contents);
          expect(data.source).toBe('My Computer');
          expect(data.files).toEqual({
            'folder/file.txt': 'add',
            'Pictures/grumpycat.jpg': 'modify',
            'folder/deleted.txt': 'delete'
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
});
