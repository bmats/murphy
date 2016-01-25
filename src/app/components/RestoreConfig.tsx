import {remote, ipcRenderer} from 'electron';
const dialog = remote.dialog;
import * as moment from 'moment';
import * as path from 'path';
import * as React from 'react';
import MUI from 'material-ui';
import Theme from './MurphyTheme';
import {Archive, ArchiveVersion} from '../models';
import AddSelectField from './AddSelectField';
import VerticalSeparator from './VerticalSeparator';

interface Props {
  archives: Archive[];
  archive: Archive;
  version: ArchiveVersion;
  destination: string;
  onArchiveChange?: (newArchive: Archive) => any;
  onVersionChange?: (newVersion: ArchiveVersion) => any;
  onDestinationChange?: (newDestination: string) => any;
}

interface State {
  archiveVersions?: ArchiveVersion[];
}

export default class RestoreConfig extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      archiveVersions: []
    };

    ipcRenderer.send('get-archive-versions', this.props.archive);
    ipcRenderer.on('archive-versions', (event, arg) => {
      if (arg.archive.name === this.props.archive.name) {
        arg.versions.forEach(v => v.date = new Date(v.date)); // unserialize
        this.setState({
          archiveVersions: arg.versions
        });
        if (this.props.onVersionChange) this.props.onVersionChange(arg.versions[0]);
      }
    });
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.archive !== this.props.archive) {
      this.setState({
        archiveVersions: []
      });
      if (this.props.onVersionChange) this.props.onVersionChange(null);
      ipcRenderer.send('get-archive-versions', nextProps.archive);
    }
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
      destination: {
        marginBottom: padding / 2,
      },
    };
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  private onArchiveAdd() {
    dialog.showOpenDialog({
      title: 'Select Folder',
      properties: ['openDirectory', 'createDirectory']
    }, (folders) => {
      if (!folders) return;
      ipcRenderer.send('add-archive', {
        name: path.basename(folders[0]), // TODO: present dialog to name backup
        path: folders[0]
      });
      this.setState({
        archiveVersions: []
      });
      if (this.props.onVersionChange) this.props.onVersionChange(null);
    });
  }

  private onArchiveNameChange(archiveName: string) {
    this.onArchiveChange(this.props.archives.find(a => a.name === archiveName));
  }

  private onArchiveChange(newArchive: Archive) {
    this.setState({
      archiveVersions: []
    });
    if (this.props.onArchiveChange) this.props.onArchiveChange(newArchive);
    if (this.props.onVersionChange) this.props.onVersionChange(null);
    ipcRenderer.send('get-archive-versions', newArchive);
  }

  private onVersionChange(e, index: number) {
    const newVersion = this.state.archiveVersions[index];
    if (this.props.onVersionChange) this.props.onVersionChange(newVersion);
  }

  private onBrowse() {
    dialog.showOpenDialog({
      title: 'Select Folder',
      properties: ['openDirectory', 'createDirectory']
    }, (folders) => {
      if (!folders || folders.length < 1) return;
      if (this.props.onDestinationChange) this.props.onDestinationChange(folders[0]);
    });
  }

  render() {
    let archiveIndex = this.props.archives.indexOf(this.props.archive);
    if (archiveIndex < 0) archiveIndex = 0;

    let versionIndex = this.state.archiveVersions.indexOf(this.props.version);
    if (versionIndex < 0) versionIndex = 0;
    const versionItems = this.state.archiveVersions.map((v, i) =>
      <MUI.MenuItem key={i} primaryText={moment(v.date).format('MMM D, YYYY h:mm A')} value={i} />);

    let destinationText;
    if (this.props.destination) {
      destinationText = <div style={this.styles.destination}>{path.basename(this.props.destination)}</div>;
    }

    return (
      <div style={this.styles.container}>
        <div style={this.styles.panel}>
          <h2 style={this.styles.heading}>
            What
            <small style={this.styles.headingCaption}>What backup should I restore from?</small>
          </h2>
          <AddSelectField label="Backup" items={this.props.archives.map(a => a.name)} value={archiveIndex}
            onAdd={this.onArchiveAdd.bind(this)} onChange={this.onArchiveNameChange.bind(this)} />
          <br />
          <MUI.SelectField value={versionIndex} onChange={this.onVersionChange.bind(this)} labelStyle={{ paddingRight: 0 }}>
            {versionItems}
          </MUI.SelectField>
        </div>
        <VerticalSeparator verticalMargin={Theme.spacing.desktopGutter} direction="right" />
        <div style={this.styles.panel}>
          <h2 style={this.styles.heading}>
            Where
            <small style={this.styles.headingCaption}>Where should I restore the files?</small>
          </h2>
          {destinationText}
          <MUI.FlatButton label="Select Folder" onClick={this.onBrowse.bind(this)} />
        </div>
      </div>
    );
  }
}
