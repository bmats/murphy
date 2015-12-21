import {remote, ipcRenderer} from 'electron';
const dialog = remote.require('dialog');
import * as _ from 'lodash';
import * as path from 'path';
import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Theme = require('./MurphyTheme');
import {Archive, ArchiveVersion} from '../models';
import AddSelectField from './AddSelectField';
import VerticalSeparator from './VerticalSeparator';

interface Props {
  archives: Archive[];
}

interface State {
  isRunning?: boolean;
  hasRun?: boolean;
  progress?: number;
  progressMessage?: string;
  selectedArchive?: Archive;
  selectedArchiveVersions?: ArchiveVersion[];
  selectedVersion?: ArchiveVersion;
  destination?: string;
}

export default class Restore extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    ipcRenderer.on('restore-progress', _.throttle((event, arg) => {
      this.setState({
        progress: arg.progress,
        progressMessage: arg.message
      });
    }, 50));
    ipcRenderer.on('restore-complete', (event, arg) => {
      this.setState({
        isRunning: false
      });
    });
    ipcRenderer.on('restore-error', (event, arg) => {
      this.setState({
        isRunning: false
      });
      dialog.showErrorBox('Restore error', arg);
    });

    ipcRenderer.on('archive-versions', (event, arg) => {
      if (arg.archive.name === this.state.selectedArchive.name) {
        arg.versions.forEach(v => v.date = new Date(v.date)); // unserialize
        this.setState({
          selectedArchiveVersions: arg.versions,
          selectedVersion: arg.versions[0]
        });
      }
    })

    this.state = {
      isRunning: false,
      hasRun: false,
      progress: 0,
      progressMessage: null,
      selectedArchive: props.archives[0],
      selectedArchiveVersions: [],
      selectedVersion: null,
      destination: null
    };
    ipcRenderer.send('get-archive-versions', this.state.selectedArchive);
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.archives) {
      const newArchive = nextProps.archives[0];
      this.setState({
        selectedArchive: newArchive,
        selectedArchiveVersions: []
      });
      ipcRenderer.send('get-archive-versions', newArchive);
    }
  }

  private get styles() {
    const padding: number = Theme.spacing.desktopGutter;
    return {
      tab: {
      },
      card: {
        position: 'relative',
        margin: padding,
        padding: padding,
      },
      leftSide: {
        display: 'inline-block',
        width: '50%',
        verticalAlign: 'top',
        paddingRight: padding,
        boxSizing: 'border-box',
        textAlign: 'center'
      },
      rightSide: {
        display: 'inline-block',
        width: '50%',
        verticalAlign: 'top',
        paddingLeft: padding,
        boxSizing: 'border-box',
        textAlign: 'center'
      },
      heading: {
        fontSize: 24,
        fontWeight: 400,
        marginTop: 0,
        marginBottom: padding
      },
      headingCaption: {
        display: 'block',
        fontWeight: 400,
        marginTop: 8,
        fontSize: 13
      },
      destination: {
        marginBottom: padding / 2
      },
      progressMessage: {
        fontSize: 14,
        marginTop: padding / 2
      },
      runButton: {
        position: 'fixed',
        right: padding,
        bottom: padding
      }
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
      // TODO: change selected value
      this.setState({
        selectedArchiveVersions: []
      });
    });
  }

  private onArchiveChange(archiveName: string) {
    const newArchive = this.props.archives.find(a => a.name === archiveName);
    this.setState({
      selectedArchive: newArchive,
      selectedArchiveVersions: []
    });
    ipcRenderer.send('get-archive-versions', newArchive);
  }

  private onStartClick() {
    this.state.isRunning = true;
    this.state.hasRun = true;
    ipcRenderer.send('start-restore', {
      source: this.state.selectedArchive,
      version: { date: this.state.selectedVersion.date.valueOf() }, // serialize
      destination: this.state.destination
    });
  }

  render() {
    let archiveIndex = this.props.archives.indexOf(this.state.selectedArchive);
    if (archiveIndex < 0) archiveIndex = 0;
    const isRestoreReady = !this.state.isRunning && this.props.archives.length > 0 && this.state.selectedVersion && this.state.destination;

    let versionIndex = this.state.selectedArchiveVersions.indexOf(this.state.selectedVersion);
    if (versionIndex < 0) versionIndex = 0;
    const versionItems: __MaterialUI.Menu.MenuItemRequest[] = this.state.selectedArchiveVersions.map((v, i) => {
      return {
        text: Restore.formatDate(v.date),
        payload: i
      };
    });

    const statusCards = [];
    if (this.state.hasRun) {
      statusCards.push(
        <MUI.Paper key="progress" style={this.styles.card}>
          <MUI.LinearProgress mode="determinate" value={this.state.progress * 100} />
          <div style={this.styles.progressMessage}>{this.state.progressMessage}</div>
        </MUI.Paper>
      );
    }

    let destinationText;
    if (this.state.destination) {
      destinationText = <div style={this.styles.destination}>{path.basename(this.state.destination)}</div>;
    }

    return (
      <div style={this.styles.tab}>
        <MUI.Paper style={this.styles.card}>
          <div style={this.styles.leftSide}>
            <h2 style={this.styles.heading}>
              What
              <small style={this.styles.headingCaption}>What backup should I restore from?</small>
            </h2>
            <AddSelectField label="Backup" items={this.props.archives.map(a => a.name)} value={archiveIndex}
              onAdd={this.onArchiveAdd.bind(this)} onChange={this.onArchiveChange.bind(this)} />
            <MUI.SelectField value={versionIndex} menuItems={versionItems} onChange={this._handleVersionChange.bind(this)} />
          </div>
          <VerticalSeparator verticalMargin={Theme.spacing.desktopGutter} />
          <div style={this.styles.rightSide}>
            <h2 style={this.styles.heading}>
              Where
              <small style={this.styles.headingCaption}>Where should I restore the files?</small>
            </h2>
            {destinationText}
            <MUI.RaisedButton label="Select Folder" onClick={this._handleBrowseClick.bind(this)} />
          </div>
        </MUI.Paper>
        {statusCards}
        <MUI.FloatingActionButton style={this.styles.runButton} onClick={this.onStartClick.bind(this)} disabled={!isRestoreReady}>
          <MUI.SvgIcon color={isRestoreReady ? undefined : 'rgba(0, 0, 0, 0.3)'}>
            <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
          </MUI.SvgIcon>
        </MUI.FloatingActionButton>
      </div>
    );
  }

  private _handleVersionChange(e, index: number) {
    this.setState({
      selectedVersion: this.state.selectedArchiveVersions[index]
    });
  }

  private _handleBrowseClick() {
    dialog.showOpenDialog({
      title: 'Select Folder',
      properties: ['openDirectory', 'createDirectory']
    }, (folders) => {
      if (!folders || folders.length < 1) return;
      this.setState({
        destination: folders[0]
      });
    });
  }

  private static formatDate(date: Date) {
    const year   = date.getFullYear();
    const month  = (date.getMonth()   <  9 ? '0' : '') + (date.getMonth() + 1);
    const day    = (date.getDate()    < 10 ? '0' : '') + date.getDate();
    const hour   = (date.getHours()   < 10 ? '0' : '') + date.getHours();
    const minute = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    const second = (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }
}
