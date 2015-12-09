import Archive from '../../src/engine/Archive';

export default class DummyArchive extends Archive {
  constructor(name) {
    super(name);
  }

  init() {
    return null;
  }

  rebuild() {
    return null;
  }

  createVersion() {
    return null;
  }

  getVersions() {
    return null;
  }
}
