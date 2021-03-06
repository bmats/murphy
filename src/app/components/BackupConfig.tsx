import {remote} from 'electron';
const dialog = remote.dialog;
import * as path from 'path';
import * as React from 'react';
import MUI from 'material-ui';
import Theme from './MurphyTheme';
import {Engine, Source, Archive} from '../models';
import AddSelectField from './AddSelectField';
import VerticalSeparator from './VerticalSeparator';

interface Props {
  engine: Engine;
  source: Source;
  archive: Archive;
  onSourceChange?: (newSource: Source) => any;
  onArchiveChange?: (newArchive: Archive) => any;
}

export default class BackupConfig extends React.Component<Props, {}> {
  constructor(props: Props) {
    super(props);
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  private get styles() {
    const padding: number = Theme.spacing.desktopGutter;
    return {
      container: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'stretch',
      },
      panel: {
        flexBasis: '50%',
        boxSizing: 'border-box',
        textAlign: 'center',
      },
      heading: {
        fontSize: 24,
        fontWeight: 400,
        marginTop: 0,
        marginBottom: padding,
      },
      headingCaption: {
        display: 'block',
        fontWeight: 400,
        marginTop: 8,
        fontSize: 13,
      },
    };
  }

  private onSourceAdd() {
    dialog.showOpenDialog({
      title: 'Select Folders',
      // defaultPath: process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'],
      properties: ['openDirectory', 'multiSelections']
    }, (folders) => {
      if (!folders) return;
      this.props.engine.addSource(
        folders.map(f => path.basename(f)).join(', '), // TODO: present dialog to name source
        folders);
    });
  }

  private onSourceChange(sourceName: string) {
    const newSource = this.props.engine.config.sources.find(s => s.name === sourceName);
    if (this.props.onSourceChange) this.props.onSourceChange(newSource);
  }

  private onArchiveAdd() {
    dialog.showOpenDialog({
      title: 'Select Folder',
      properties: ['openDirectory', 'createDirectory']
    }, (folders) => {
      if (!folders) return;
      this.props.engine.addArchive(
        path.basename(folders[0]), // TODO: present dialog to name backup
        folders[0]);
    });
  }

  private onArchiveChange(archiveName: string) {
    const newArchive = this.props.engine.config.archives.find(a => a.name === archiveName);
    this.setState({
      selectedArchive: newArchive
    });
    if (this.props.onArchiveChange) this.props.onArchiveChange(newArchive);
  }

  render() {
    let sourceIndex = this.props.source
      ? this.props.engine.config.sources.findIndex(s => s.name === this.props.source.name)
      : 0;
    if (sourceIndex < 0) sourceIndex = 0;

    let archiveIndex = this.props.archive
      ? this.props.engine.config.archives.findIndex(a => a.name === this.props.archive.name)
      : 0;
    if (archiveIndex < 0) archiveIndex = 0;

    return (
      <div style={this.styles.container}>
        <div style={this.styles.panel}>
          <h2 style={this.styles.heading}>
            What
            <small style={this.styles.headingCaption}>What folders should I back up?</small>
          </h2>
          <AddSelectField label="Folders" items={this.props.engine.config.sources.map(s => s.name)} value={sourceIndex}
            onAdd={this.onSourceAdd.bind(this)} onChange={this.onSourceChange.bind(this)} />
        </div>
        <VerticalSeparator verticalMargin={Theme.spacing.desktopGutter} direction="right" />
        <div style={this.styles.panel}>
          <h2 style={this.styles.heading}>
            Where
            <small style={this.styles.headingCaption}>Where should I back them up?</small>
          </h2>
          <AddSelectField label="Backup" items={this.props.engine.config.archives.map(a => a.name)} value={archiveIndex}
            onAdd={this.onArchiveAdd.bind(this)} onChange={this.onArchiveChange.bind(this)} />
        </div>
      </div>
    );
  }
}
