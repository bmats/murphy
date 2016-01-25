import * as fs from 'fs';
import * as MockFs from 'mock-fs';
const MockDate = require('mockdate');
import Engine from '../../src/engine/Engine';
import Source from '../../src/engine/Source';
import Config from '../../src/engine/Config';
import ArchiveVersion from '../../src/engine/ArchiveVersion';
import FilesystemArchive from '../../src/engine/fs/FilesystemArchive';
import FilesystemArchiveVersion from '../../src/engine/fs/FilesystemArchiveVersion';

describe('Engine', () => {

  beforeEach(() => {
    MockFs({});
    MockDate.set(new Date(2018, 0, 11, 5, 0, 0));
  });

  afterEach(() => {
    MockFs.restore();
    MockDate.reset();
  });

  describe('.runBackup()', () => {
    let originalJasmineTimeout: number;
    beforeAll(() => {
      originalJasmineTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });
    afterAll(() => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalJasmineTimeout;
    });

    it('adds all files when there are no previous versions', (done) => {
      MockFs({
        Source: {
          folder: {
            'file1.txt': '',
            'file2.txt': ''
          },
          'file3.txt': ''
        },
        Archive: {
          Latest: {},
          Versions: {}
        }
      });

      const engine = new Engine(new Config());
      const source = new Source('Test Source', ['Source']);
      const archive = new FilesystemArchive('Test Archive', 'Archive');
      let newVersion: ArchiveVersion;
      engine.runBackup(source, archive)
        .then(() => {
          expect(fs.statSync('Archive/Versions/2018-01-11 05-00-00/folder/file1.txt').isFile()).toBe(true);
          expect(fs.statSync('Archive/Versions/2018-01-11 05-00-00/folder/file2.txt').isFile()).toBe(true);
          expect(fs.statSync('Archive/Versions/2018-01-11 05-00-00/file3.txt').isFile()).toBe(true);
        })

        .then(archive.getVersions.bind(archive))
        .then(versions => newVersion = versions[0])

        .then(() => newVersion.getFileStatus('folder/file1.txt'))
        .then(status => expect(status).toBe('add'))
        .then(() => newVersion.getFileStatus('folder/file2.txt'))
        .then(status => expect(status).toBe('add'))
        .then(() => newVersion.getFileStatus('file3.txt'))
        .then(status => expect(status).toBe('add'))

        .catch(err => fail(err))
        .then(done);
    });

    it('marks files as modified only if they have changed', (done) => {
      MockFs({
        Source: {
          folder: {
            'file1.txt': 'changed!',
            'file2.txt': ''
          },
          'file3.txt': 'changed!'
        },
        Archive: {
          Latest: {},
          Versions: {
            '2016-01-01 12-00-01': {
              '.index': 'source: My Computer\nadd:\n  folder/file1.txt: da39a3ee5e6b4b0d3255bfef95601890afd80709\n  folder/file2.txt: da39a3ee5e6b4b0d3255bfef95601890afd80709\n  file3.txt: da39a3ee5e6b4b0d3255bfef95601890afd80709\n',
              folder: {
                'file1.txt': '',
                'file2.txt': ''
              },
              'file3.txt': ''
            }
          }
        }
      });

      const engine = new Engine(new Config());
      const source = new Source('Test Source', ['Source']);
      const archive = new FilesystemArchive('Test Archive', 'Archive');
      let newVersion: ArchiveVersion;
      engine.runBackup(source, archive)
        .then(archive.getVersions.bind(archive))
        .then(versions => newVersion = versions[0])

        .then(() => newVersion.getFileStatus('folder/file1.txt'))
        .then(status => expect(status).toBe('modify'))
        .then(() => newVersion.getFileStatus('folder/file2.txt'))
        .then(status => expect(status).toBeUndefined())
        .then(() => newVersion.getFileStatus('file3.txt'))
        .then(status => expect(status).toBe('modify'))

        .then(() => newVersion.getFiles())
        .then(files => expect(files).toEqualInAnyOrder(['folder/file1.txt', 'file3.txt']))

        .catch(err => fail(err))
        .then(done);
    });

    it('indicates files are deleted if they are no longer in the source', (done) => {
      MockFs({
        Source: {},
        Archive: {
          Latest: {},
          Versions: {
            '2016-01-01 12-00-01': {
              '.index': 'source: My Computer\nadd:\n  folder/file1.txt: da39a3ee5e6b4b0d3255bfef95601890afd80709\n  folder/file2.txt: da39a3ee5e6b4b0d3255bfef95601890afd80709\n  file3.txt: da39a3ee5e6b4b0d3255bfef95601890afd80709\n',
              folder: {
                'file1.txt': '',
                'file2.txt': ''
              },
              'file3.txt': ''
            }
          }
        }
      });

      const engine = new Engine(new Config());
      const source = new Source('Test Source', ['Source']);
      const archive = new FilesystemArchive('Test Archive', 'Archive');
      let newVersion: ArchiveVersion;
      engine.runBackup(source, archive)
        .then(archive.getVersions.bind(archive))
        .then(versions => newVersion = versions[0])

        .then(() => newVersion.getFileStatus('folder/file1.txt'))
        .then(status => expect(status).toBe('delete'))
        .then(() => newVersion.getFileStatus('folder/file2.txt'))
        .then(status => expect(status).toBe('delete'))
        .then(() => newVersion.getFileStatus('file3.txt'))
        .then(status => expect(status).toBe('delete'))

        .catch(err => fail(err))
        .then(done);
    });

    it('marks files which have been previously deleted as new', (done) => {
      MockFs({
        Source: {
          'file3.txt': '',
          'file4.txt': 'modified'
        },
        Archive: {
          Latest: {},
          Versions: {
            '2014-01-01 12-00-01': {
              '.index': 'source: My Computer\nadd:\n  file4.txt: da39a3ee5e6b4b0d3255bfef95601890afd80709\n',
              'file4.txt': ''
            },
            '2015-01-01 12-00-01': {
              '.index': 'source: My Computer\nadd:\n  file3.txt: da39a3ee5e6b4b0d3255bfef95601890afd80709\ndelete:\n  file4.txt:\n',
              'file3.txt': ''
            },
            '2016-01-01 12-00-01': {
              '.index': 'source: My Computer\nadd:\n  file5.txt: da39a3ee5e6b4b0d3255bfef95601890afd80709\ndelete:\n  file3.txt:\n',
              'file5.txt': ''
            },
            '2017-01-01 12-00-01': {
              '.index': 'source: My Computer\nadd:\n  file4.txt: da39a3ee5e6b4b0d3255bfef95601890afd80709\ndelete:\n  file5.txt:\n',
              'file4.txt': ''
            }
          }
        }
      });

      const engine = new Engine(new Config());
      const source = new Source('Test Source', ['Source']);
      const archive = new FilesystemArchive('Test Archive', 'Archive');
      let newVersion: ArchiveVersion;
      engine.runBackup(source, archive)
        .then(archive.getVersions.bind(archive))
        .then(versions => newVersion = versions[0])

        .then(() => newVersion.getFileStatus('file3.txt'))
        .then(status => expect(status).toBe('add'))
        .then(() => newVersion.getFileStatus('file4.txt'))
        .then(status => expect(status).toBe('modify'))
        .then(() => newVersion.getFileStatus('file5.txt'))
        .then(status => expect(status).toBeUndefined())

        .catch(err => fail(err))
        .then(done);
    });

    it('filters source files using Config.fileRegExps', (done) => {
      MockFs({
        Source: {
          folder: {
            'file1.ts': '',
            'file2.tsx': '',
            'file3.ts': ''
          },
          excludedFolder: {
            'picture.jpg': ''
          },
          'file3.txt': '',
          'file4.md': ''
        },
        Archive: {
          Latest: {},
          Versions: {}
        }
      });

      const config = new Config();
      config.fileRegExps = [/x/];
      const engine = new Engine(config);

      const source = new Source('Test Source', ['Source']);
      const archive = new FilesystemArchive('Test Archive', 'Archive');
      let newVersion: ArchiveVersion;
      engine.runBackup(source, archive)
        .then(() => {
          expect(fs.readdirSync('Archive/Versions/2018-01-11 05-00-00')).toEqualInAnyOrder(['.index', 'folder', 'file4.md']);
          expect(fs.readdirSync('Archive/Versions/2018-01-11 05-00-00/folder')).toEqualInAnyOrder(['file1.ts', 'file3.ts']);
          expect(fs.statSync('Archive/Versions/2018-01-11 05-00-00/folder/file1.ts').isFile()).toBe(true);
          expect(fs.statSync('Archive/Versions/2018-01-11 05-00-00/folder/file3.ts').isFile()).toBe(true);
          expect(fs.statSync('Archive/Versions/2018-01-11 05-00-00/file4.md').isFile()).toBe(true);
        })

        .then(archive.getVersions.bind(archive))
        .then(versions => newVersion = versions[0])

        .then(() => newVersion.getFileStatus('folder/file1.ts'))
        .then(status => expect(status).toBe('add'))
        .then(() => newVersion.getFileStatus('folder/file3.ts'))
        .then(status => expect(status).toBe('add'))
        .then(() => newVersion.getFileStatus('file4.md'))
        .then(status => expect(status).toBe('add'))

        .catch(err => fail(err))
        .then(done);
    });

    it('can handle thousands of files', (done) => {
      const FILE_COUNT = 12345;

      const filesystem: any = {
        Source: {},
        Archive: {
          Latest: {},
          Versions: {}
        }
      };
      for (let i = 0; i < FILE_COUNT; ++i) {
        filesystem.Source[`file${i}.txt`] = `file ${i}`;
      }
      MockFs(filesystem);

      const expectedFiles = Object.keys(filesystem.Source);

      const engine = new Engine(new Config());
      const source = new Source('Test Source', ['Source']);
      const archive = new FilesystemArchive('Test Archive', 'Archive');
      engine.runBackup(source, archive)
        .then(() => expect(fs.readdirSync('Archive/Versions/2018-01-11 05-00-00')).toEqualInAnyOrder(expectedFiles.concat('.index')))

        .then(archive.getVersions.bind(archive))
        .then(versions => {
          const newVersion = versions[0];
          return Promise.all(expectedFiles.map(file =>
            newVersion.getFileStatus(file)
              .then(status => expect(status).toBe('add'))
          ))
        })

        .catch(err => fail(err))
        .then(done);
    });

    it('applies archive version changes', (done) => {
      MockFs({
        Source: {
          folder: {
            'file1.txt': '',
            'file2.txt': ''
          },
          'file3.txt': ''
        },
        Archive: {
          Latest: {},
          Versions: {}
        }
      });

      const engine = new Engine(new Config());
      const source = new Source('Test Source', ['Source']);
      const archive = new FilesystemArchive('Test Archive', 'Archive');
      let duplicateVersion: FilesystemArchiveVersion;
      engine.runBackup(source, archive)
        // Create a second archive version to load and check for correct files
        .then(() => duplicateVersion = new FilesystemArchiveVersion(new Date(), 'Archive'))
        .then(() => duplicateVersion.load()) // load from index

        .then(() => duplicateVersion.getFiles())
        .then(files => expect(files).toEqualInAnyOrder(['folder/file1.txt', 'folder/file2.txt', 'file3.txt']))

        .then(() => duplicateVersion.getFileStatus('folder/file1.txt'))
        .then(status => expect(status).toBe('add'))
        .then(() => duplicateVersion.getFileStatus('folder/file2.txt'))
        .then(status => expect(status).toBe('add'))
        .then(() => duplicateVersion.getFileStatus('file3.txt'))
        .then(status => expect(status).toBe('add'))

        .catch(err => fail(err))
        .then(done);
    });

    it('rebuilds the destination', (done) => {
      MockFs({
        Source: {
          folder: {
            'file1.txt': '',
            'file2.txt': ''
          },
          'file3.txt': ''
        },
        Archive: {
          Latest: {},
          Versions: {}
        }
      });

      const engine = new Engine(new Config());
      const source = new Source('Test Source', ['Source']);
      const archive = new FilesystemArchive('Test Archive', 'Archive');
      engine.runBackup(source, archive)
        .then(() => {
          expect(fs.lstatSync('Archive/Latest/folder/file1.txt').isSymbolicLink()).toBe(true);
          expect(fs.readlinkSync('Archive/Latest/folder/file1.txt'))
            .toBe('Archive/Versions/2018-01-11 05-00-00/folder/file1.txt');
          expect(fs.lstatSync('Archive/Latest/folder/file2.txt').isSymbolicLink()).toBe(true);
          expect(fs.readlinkSync('Archive/Latest/folder/file2.txt'))
            .toBe('Archive/Versions/2018-01-11 05-00-00/folder/file2.txt');
          expect(fs.lstatSync('Archive/Latest/file3.txt').isSymbolicLink()).toBe(true);
          expect(fs.readlinkSync('Archive/Latest/file3.txt'))
            .toBe('Archive/Versions/2018-01-11 05-00-00/file3.txt');
        })

        .catch(err => fail(err))
        .then(done);
    });

    it('sends progress update callbacks', (done) => {
      MockFs({
        Source: {
          'file1.txt': ''
        },
        Archive: {
          Latest: {},
          Versions: {}
        }
      });

      let callbackCalled = false;
      function callback(progress: number, message: string) {
        expect(progress).toEqual(jasmine.any(Number));
        expect(progress).toBeBetween([0, 1]);
        expect(message).toEqual(jasmine.any(String));
        callbackCalled = true;
      }

      const engine = new Engine(new Config());
      const source = new Source('Test Source', ['Source']);
      const archive = new FilesystemArchive('Test Archive', 'Archive');
      engine.runBackup(source, archive, callback)
        .catch(err => fail(err))
        .then(() => {
          if (!callbackCalled) fail('Callback was not called');
          done();
        });
    });

    it('returns the new ArchiveVersion', (done) => {
      MockFs({
        Source: {},
        Archive: {
          Latest: {},
          Versions: {}
        }
      });

      const engine = new Engine(new Config());
      const source = new Source('Test Source', ['Source']);
      const archive = new FilesystemArchive('Test Archive', 'Archive');
      let newVersion: ArchiveVersion;
      engine.runBackup(source, archive)
        .then((version) => {
          expect(version instanceof ArchiveVersion).toBe(true);
          expect(version.date).toEqual(new Date());
        })
        .catch(err => fail(err))
        .then(done);
    });
  });

  describe('.runRestore()', () => {
    it('restores all files and creates a summary', (done) => {
      MockFs({
        out: {},
        Archive: {
          Versions: {
            '2016-01-01 00-00-00': {
              '.index': 'source: My Computer\nadd:\n  folder/file1.txt: a379624177abc4679cafafa8eae1d73e1478aaa6\n  folder/file2.txt: 693a1c717811546a82e06145f0d12f4e35710bb9\n  file3.txt: 73d67db1dea761091feaa0437fc7816e8f5c3c38\n',
              folder: {
                'file1.txt': 'file1 contents',
                'file2.txt': 'file2 contents'
              },
              'file3.txt': 'file3 contents'
            }
          }
        }
      });

      const engine = new Engine(new Config());
      const source = new FilesystemArchive('Test Archive', 'Archive');
      source.getVersions()
        .then(versions => engine.runRestore(source, versions[0], 'out'))
        .then(() => {
          expect(fs.readdirSync('out')).toEqualInAnyOrder(['Restore Summary.txt', 'folder', 'file3.txt']);
          expect(fs.readdirSync('out/folder')).toEqualInAnyOrder(['file1.txt', 'file2.txt']);
          expect(fs.readFileSync('out/folder/file1.txt', 'utf8')).toBe('file1 contents');
          expect(fs.readFileSync('out/folder/file2.txt', 'utf8')).toBe('file2 contents');
          expect(fs.readFileSync('out/file3.txt', 'utf8')).toBe('file3 contents');
        })
        .catch(err => fail(err))
        .then(done);
    });

    it('restores files from previous revisions', (done) => {
      MockFs({
        out: {},
        Archive: {
          Versions: {
            '2015-01-01 00-00-00': {
              '.index': 'source: My Computer\nadd:\n  file1.txt: a379624177abc4679cafafa8eae1d73e1478aaa6\n  file2.txt: 693a1c717811546a82e06145f0d12f4e35710bb9\n',
              'file1.txt': 'file1 contents',
              'file2.txt': 'file2 contents'
            },
            '2016-01-01 00-00-00': {
              '.index': 'source: My Computer\nmodify:\n  file1.txt: 4d540dba07948a3e94722b1bb0620b76d054959b\n',
              'file1.txt': 'file1 contents 2',
            }
          }
        }
      });

      const engine = new Engine(new Config());
      const source = new FilesystemArchive('Test Archive', 'Archive');
      source.getVersions()
        .then(versions => engine.runRestore(source, versions[0], 'out'))
        .then(() => {
          expect(fs.readdirSync('out')).toEqualInAnyOrder(['Restore Summary.txt', 'file1.txt', 'file2.txt']);
          expect(fs.readFileSync('out/file1.txt', 'utf8')).toBe('file1 contents 2');
          expect(fs.readFileSync('out/file2.txt', 'utf8')).toBe('file2 contents');
        })
        .catch(err => fail(err))
        .then(done);
    });

    it('restores the latest version of modified files', (done) => {
      MockFs({
        out: {},
        Archive: {
          Versions: {
            '2015-01-01 00-00-00': {
              '.index': 'source: My Computer\nadd:\n  file1.txt: a379624177abc4679cafafa8eae1d73e1478aaa6\n  file2.txt: 693a1c717811546a82e06145f0d12f4e35710bb9\n  file3.txt: 73d67db1dea761091feaa0437fc7816e8f5c3c38\n',
              'file1.txt': 'file1 contents',
              'file2.txt': 'file2 contents',
              'file3.txt': 'file3 contents'
            },
            '2016-01-01 00-00-00': {
              '.index': 'source: My Computer\nmodify:\n  file1.txt: 4d540dba07948a3e94722b1bb0620b76d054959b\n  file2.txt: 8f5877b1ee63da2e57bec98392366d787f473a2c\n',
              'file1.txt': 'file1 contents 2',
              'file2.txt': 'file2 contents 2',
            },
            '2017-01-01 00-00-00': {
              '.index': 'source: My Computer\nmodify:\n  file1.txt: c6a4a260296c8ff1e3ca5aac6f180a89cc59a9e4\n',
              'file1.txt': 'file1 contents 3'
            }
          }
        }
      });

      const engine = new Engine(new Config());
      const source = new FilesystemArchive('Test Archive', 'Archive');
      source.getVersions()
        .then(versions => engine.runRestore(source, versions[0], 'out'))
        .then(() => {
          expect(fs.readdirSync('out')).toEqualInAnyOrder(['Restore Summary.txt', 'file1.txt', 'file2.txt', 'file3.txt']);
          expect(fs.readFileSync('out/file1.txt', 'utf8')).toBe('file1 contents 3');
          expect(fs.readFileSync('out/file2.txt', 'utf8')).toBe('file2 contents 2');
          expect(fs.readFileSync('out/file3.txt', 'utf8')).toBe('file3 contents');
        })
        .catch(err => fail(err))
        .then(done);
    });

    it('does not restore deleted files', (done) => {
      MockFs({
        out: {},
        Archive: {
          Versions: {
            '2015-01-01 00-00-00': {
              '.index': 'source: My Computer\nadd:\n  file1.txt: a379624177abc4679cafafa8eae1d73e1478aaa6\n',
              'file1.txt': 'file1 contents'
            },
            '2016-01-01 00-00-00': {
              '.index': 'source: My Computer\ndelete:\n  file1.txt:\n'
            }
          }
        }
      });

      const engine = new Engine(new Config());
      const source = new FilesystemArchive('Test Archive', 'Archive');
      source.getVersions()
        .then(versions => engine.runRestore(source, versions[0], 'out'))
        .then(() => {
          expect(fs.readdirSync('out')).toEqual(['Restore Summary.txt']);
        })
        .catch(err => fail(err))
        .then(done);
    });

    it('restores previously deleted files', (done) => {
      MockFs({
        out: {},
        Archive: {
          Versions: {
            '2015-01-01 00-00-00': {
              '.index': 'source: My Computer\nadd:\n  file1.txt: a379624177abc4679cafafa8eae1d73e1478aaa6\n',
              'file1.txt': 'file1 contents'
            },
            '2016-01-01 00-00-00': {
              '.index': 'source: My Computer\ndelete:\n  file1.txt:\n'
            },
            '2017-01-01 00-00-00': {
              '.index': 'source: My Computer\nadd:\n  file1.txt: 4d540dba07948a3e94722b1bb0620b76d054959b\n',
              'file1.txt': 'file1 contents 2'
            }
          }
        }
      });

      const engine = new Engine(new Config());
      const source = new FilesystemArchive('Test Archive', 'Archive');
      source.getVersions()
        .then(versions => engine.runRestore(source, versions[0], 'out'))
        .then(() => {
          expect(fs.readdirSync('out')).toEqualInAnyOrder(['Restore Summary.txt', 'file1.txt']);
          expect(fs.readFileSync('out/file1.txt', 'utf8')).toBe('file1 contents 2');
        })
        .catch(err => fail(err))
        .then(done);
    });

    it('does not overwrite existing files', (done) => {
      MockFs({
        out: {
          'file1.txt': 'derp'
        },
        Archive: {
          Versions: {
            '2015-01-01 00-00-00': {
              '.index': 'source: My Computer\nadd:\n  file1.txt: a379624177abc4679cafafa8eae1d73e1478aaa6\n',
              'file1.txt': 'file1 contents'
            }
          }
        }
      });

      const engine = new Engine(new Config());
      const source = new FilesystemArchive('Test Archive', 'Archive');
      source.getVersions()
        .then(versions => engine.runRestore(source, versions[0], 'out'))
        .then(() => fail('Expected error'))
        .catch(err => expect(err).not.toBeUndefined())
        .then(done);
    });

    it('restores only from the specified version', (done) => {
      MockFs({
        out: {},
        Archive: {
          Versions: {
            '2015-01-01 00-00-00': {
              '.index': 'source: My Computer\nadd:\n  file1.txt: a379624177abc4679cafafa8eae1d73e1478aaa6\n',
              'file1.txt': 'file1 contents'
            },
            '2016-01-01 00-00-00': {
              '.index': 'source: My Computer\nadd:\n  file2.txt: 693a1c717811546a82e06145f0d12f4e35710bb9\n',
              'file2.txt': 'file2 contents'
            },
            '2017-01-01 00-00-00': {
              '.index': 'source: My Computer\nadd:\n  file3.txt: 8f5877b1ee63da2e57bec98392366d787f473a2c\nmodify:\n  file2.txt: 73d67db1dea761091feaa0437fc7816e8f5c3c38\n',
              'file2.txt': 'file2 contents 2',
              'file3.txt': 'file3 contents'
            }
          }
        }
      });

      const engine = new Engine(new Config());
      const source = new FilesystemArchive('Test Archive', 'Archive');
      source.getVersions()
        .then(versions => engine.runRestore(source, versions[1], 'out')) // second to last - 2016
        .then(() => {
          expect(fs.readdirSync('out')).toEqualInAnyOrder(['Restore Summary.txt', 'file1.txt', 'file2.txt']);
          expect(fs.readFileSync('out/file1.txt', 'utf8')).toBe('file1 contents');
          expect(fs.readFileSync('out/file2.txt', 'utf8')).toBe('file2 contents');
        })
        .catch(err => fail(err))
        .then(done);
    });

    it('sends progress update callbacks', (done) => {
      MockFs({
        out: {},
        Archive: {
          Versions: {
            '2015-01-01 00-00-00': {
              '.index': 'source: My Computer\nadd:\n  file1.txt: a379624177abc4679cafafa8eae1d73e1478aaa6\n',
              'file1.txt': 'file1 contents'
            }
          }
        }
      });

      let callbackCalled = false;
      function callback(progress: number, message: string) {
        expect(progress).toEqual(jasmine.any(Number));
        expect(progress).toBeBetween([0, 1]);
        expect(message).toEqual(jasmine.any(String));
        callbackCalled = true;
      }

      const engine = new Engine(new Config());
      const source = new FilesystemArchive('Test Archive', 'Archive');
      source.getVersions()
        .then(versions => engine.runRestore(source, versions[0], 'out', callback))
        .catch(err => fail(err))
        .then(() => {
          if (!callbackCalled) fail('Callback was not called');
          done();
        });
    });
  });
});
