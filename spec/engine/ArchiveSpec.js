import Archive from '../../src/engine/Archive';
import DummyArchive from './DummyArchive';

describe('Archive', () => {

  describe('.name', () => {
    it('returns the name', () => {
      const name = 'Archive Name';
      const archive = new DummyArchive(name);
      expect(archive.name).toBe(name);
    });
  })
});
