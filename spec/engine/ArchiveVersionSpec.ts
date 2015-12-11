import ArchiveVersion from '../../src/engine/ArchiveVersion';
import DummyArchiveVersion from './DummyArchiveVersion';

describe('ArchiveVersion', () => {

  describe('.date', () => {
    it('returns the date', () => {
      const date = new Date('2000-01-01T01:02:03');
      const archive = new DummyArchiveVersion(date);
      expect(archive.date).toBe(date);
    });
  });
});
