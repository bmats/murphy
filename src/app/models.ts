// Mirror of BackupConnector SerializedConfig
export interface Config {
  sources: Source[];
  archives: Archive[];
  fileRegExps: string[];
  ui: {
    isRegExpEnabled?: boolean;
  };
}

export interface Source {
  name: string;
}

export interface Archive {
  name: string;
}

export interface ArchiveVersion {
  date: Date;
}
