import * as fs from 'fs';
import * as MockFs from 'mock-fs';
import * as MockDate from 'mockdate';
import Engine from '../../src/engine/Engine';
import Source from '../../src/engine/Source';
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

      const engine = new Engine();
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
              '.index': 'source: My Computer\nfiles:\n  folder/file1.txt: add\n  folder/file2.txt: add\n  file3.txt: add\n',
              folder: {
                'file1.txt': '',
                'file2.txt': ''
              },
              'file3.txt': ''
            }
          }
        }
      });

      const engine = new Engine();
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

    it('indicates files are deleted if they are not longer in the source', (done) => {
      MockFs({
        Source: {},
        Archive: {
          Latest: {},
          Versions: {
            '2016-01-01 12-00-01': {
              '.index': 'source: My Computer\nfiles:\n  folder/file1.txt: add\n  folder/file2.txt: add\n  file3.txt: add\n',
              folder: {
                'file1.txt': '',
                'file2.txt': ''
              },
              'file3.txt': ''
            }
          }
        }
      });

      const engine = new Engine();
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
              '.index': 'source: My Computer\nfiles:\n  file4.txt: add\n',
              'file4.txt': ''
            },
            '2015-01-01 12-00-01': {
              '.index': 'source: My Computer\nfiles:\n  file3.txt: add\n  file4.txt: delete\n',
              'file3.txt': ''
            },
            '2016-01-01 12-00-01': {
              '.index': 'source: My Computer\nfiles:\n  file3.txt: delete\n  file5.txt: add\n',
              'file5.txt': ''
            },
            '2017-01-01 12-00-01': {
              '.index': 'source: My Computer\nfiles:\n  file4.txt: add\n  file5.txt: delete\n',
              'file4.txt': ''
            }
          }
        }
      });

      const engine = new Engine();
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

      const engine = new Engine();
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

      const engine = new Engine();
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

      const engine = new Engine();
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

      const engine = new Engine();
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
              '.index': 'source: My Computer\nfiles:\n  folder/file1.txt: add\n  folder/file2.txt: add\n  file3.txt: add\n',
              folder: {
                'file1.txt': 'file1 contents',
                'file2.txt': 'file2 contents'
              },
              'file3.txt': 'file3 contents'
            }
          }
        }
      });

      const engine = new Engine();
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
              '.index': 'source: My Computer\nfiles:\n  file1.txt: add\n  file2.txt: add\n',
              'file1.txt': 'file1 contents',
              'file2.txt': 'file2 contents'
            },
            '2016-01-01 00-00-00': {
              '.index': 'source: My Computer\nfiles:\n  file1.txt: modify\n',
              'file1.txt': 'file1 contents 2',
            }
          }
        }
      });

      const engine = new Engine();
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
              '.index': 'source: My Computer\nfiles:\n  file1.txt: add\n  file2.txt: add\n  file3.txt: add\n',
              'file1.txt': 'file1 contents',
              'file2.txt': 'file2 contents',
              'file3.txt': 'file3 contents'
            },
            '2016-01-01 00-00-00': {
              '.index': 'source: My Computer\nfiles:\n  file1.txt: modify\n  file2.txt: modify\n',
              'file1.txt': 'file1 contents 2',
              'file2.txt': 'file2 contents 2',
            },
            '2017-01-01 00-00-00': {
              '.index': 'source: My Computer\nfiles:\n  file1.txt: modify\n',
              'file1.txt': 'file1 contents 3'
            }
          }
        }
      });

      const engine = new Engine();
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
              '.index': 'source: My Computer\nfiles:\n  file1.txt: add\n',
              'file1.txt': 'file1 contents'
            },
            '2016-01-01 00-00-00': {
              '.index': 'source: My Computer\nfiles:\n  file1.txt: delete\n'
            }
          }
        }
      });

      const engine = new Engine();
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
              '.index': 'source: My Computer\nfiles:\n  file1.txt: add\n',
              'file1.txt': 'file1 contents'
            },
            '2016-01-01 00-00-00': {
              '.index': 'source: My Computer\nfiles:\n  file1.txt: delete\n'
            },
            '2017-01-01 00-00-00': {
              '.index': 'source: My Computer\nfiles:\n  file1.txt: add\n',
              'file1.txt': 'file1 contents 2'
            }
          }
        }
      });

      const engine = new Engine();
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
              '.index': 'source: My Computer\nfiles:\n  file1.txt: add\n',
              'file1.txt': 'file1 contents'
            }
          }
        }
      });

      const engine = new Engine();
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
              '.index': 'source: My Computer\nfiles:\n  file1.txt: add\n',
              'file1.txt': 'file1 contents'
            },
            '2016-01-01 00-00-00': {
              '.index': 'source: My Computer\nfiles:\n  file2.txt: add\n',
              'file2.txt': 'file2 contents'
            },
            '2017-01-01 00-00-00': {
              '.index': 'source: My Computer\nfiles:\n  file3.txt: add\n  file2.txt: modify\n',
              'file2.txt': 'file2 contents 2',
              'file3.txt': 'file3 contents'
            }
          }
        }
      });

      const engine = new Engine();
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
              '.index': 'source: My Computer\nfiles:\n  file1.txt: add\n',
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

      const engine = new Engine();
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
