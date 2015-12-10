import Archive from '../../src/engine/Archive';
import ArchiveVersion from '../../src/engine/ArchiveVersion';

export default class DummyArchive extends Archive {
  constructor(name: string) {
    super(name, 'DummyArchive');
  }

  init(): Promise<void> {
    return null;
  }

  rebuild(): Promise<void> {
    return null;
  }

  createVersion(): Promise<ArchiveVersion> {
    return null;
  }

  getVersions(): Promise<ArchiveVersion[]> {
    return null;
  }
}
