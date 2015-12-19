import {remote, ipcRenderer} from 'electron';
const dialog = remote.require('dialog');
import * as path from 'path';
import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Theme = require('./MurphyTheme');
import {Source, Archive} from '../models';
import AddSelectField from './AddSelectField';
import VerticalSeparator from './VerticalSeparator';

interface Props {
  sources: Source[];
  archives: Archive[];
}

interface State {
  running?: boolean;
  progress?: number;
  progressMessage?: string;
  selectedSource?: Source;
  selectedArchive?: Archive;
}

export default class Backup extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    ipcRenderer.on('backup-progress', (event, arg) => {
      this.setState({
        progress: arg.progress,
        progressMessage: arg.message
      });
    });
    ipcRenderer.on('backup-complete', (event, arg) => {
      this.setState({
        running: false
      });
    });
    ipcRenderer.on('backup-error', (event, arg) => {
      this.setState({
        running: false
      });
    });

    this.state = {
      running: false,
      progress: 0,
      progressMessage: null,
      selectedSource: props.sources[0],
      selectedArchive: props.archives[0]
    };
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  private get styles() {
    const padding: number = Theme.spacing.desktopGutter;
    return {
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

  private onSourceAdd() {
    dialog.showOpenDialog({
      title: 'Select Folders',
      // defaultPath: process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'],
      properties: ['openDirectory', 'multiSelections']
    }, (folders) => {
      if (!folders) return;
      ipcRenderer.send('add-source', {
        name: folders.map(f => path.basename(f)).join(', '), // TODO: present dialog to name source
        paths: folders
      });
      // TODO: change selected value
    });
  }

  private onSourceChange(sourceName: string) {
    this.setState({
      selectedSource: this.props.sources.find(s => s.name === sourceName)
    });
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
    });
  }

  private onArchiveChange(archiveName: string) {
    this.setState({
      selectedArchive: this.props.archives.find(a => a.name === archiveName)
    });
  }

  private onStartClick() {
    ipcRenderer.send('start-backup', {
      source: this.state.selectedSource,
      destination: this.state.selectedArchive
    });
  }

  render() {
    let sourceIndex = this.props.sources.indexOf(this.state.selectedSource);
    if (sourceIndex < 0) sourceIndex = 0;
    let archiveIndex = this.props.archives.indexOf(this.state.selectedArchive);
    if (archiveIndex < 0) archiveIndex = 0;
    const isBackupReady = this.props.sources.length > 0 && this.props.archives.length > 0;

    const statusCards = [];
    if (this.state.running) {
      statusCards.push(
        <MUI.Paper style={this.styles.card}>
          <MUI.LinearProgress mode="determinate" value={this.state.progress * 100} />
          <div style={this.styles.progressMessage}>{this.state.progressMessage}</div>
        </MUI.Paper>
      );
    }

    return (
      <div style={{height: '100%'}}>
        <MUI.Paper style={this.styles.card}>
          <div style={this.styles.leftSide}>
            <h2 style={this.styles.heading}>
              What
              <small style={this.styles.headingCaption}>What folders should I back up?</small>
            </h2>
            <AddSelectField label="Folders" items={this.props.sources.map(s => s.name)} value={sourceIndex}
              onAdd={this.onSourceAdd.bind(this)} onChange={this.onSourceChange.bind(this)} />
          </div>
          <VerticalSeparator verticalMargin={Theme.spacing.desktopGutter} />
          <div style={this.styles.rightSide}>
            <h2 style={this.styles.heading}>
              Where
              <small style={this.styles.headingCaption}>Where should I back them up?</small>
            </h2>
            <AddSelectField label="Backup" items={this.props.archives.map(a => a.name)} value={archiveIndex}
              onAdd={this.onArchiveAdd.bind(this)} onChange={this.onArchiveChange.bind(this)} />
          </div>
        </MUI.Paper>
        {statusCards}
        <MUI.FloatingActionButton style={this.styles.runButton} onClick={this.onStartClick.bind(this)} disabled={!isBackupReady}>
          <MUI.SvgIcon color={isBackupReady ? undefined : 'rgba(0, 0, 0, 0.3)'}>
            <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
          </MUI.SvgIcon>
        </MUI.FloatingActionButton>
      </div>
    );
  }
}
