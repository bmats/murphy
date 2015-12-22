import {remote, ipcRenderer} from 'electron';
const dialog = remote.require('dialog');
import * as _ from 'lodash';
import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Theme = require('./MurphyTheme');
import {Source, Archive, ArchiveVersion} from '../models';
import CardScroller from './CardScroller';
import BackupConfig from './BackupConfig';
import RestoreConfig from './RestoreConfig';
import ProgressCard from './ProgressCard';

interface Props {
  sources: Source[];
  archives: Archive[];
}

interface State {
  muiTheme?: MUI.Styles.MuiTheme;
  tabIndex?: string;

  backup?: JobStatus;
  backupSource?: Source;
  backupArchive?: Archive;

  restore?: JobStatus;
  restoreArchive?: Archive;
  restoreVersion?: ArchiveVersion;
  restoreDestination?: string;
}

class JobStatus {
  isRunning: boolean;
  hasRun: boolean;
  progress: number;
  progressMessage: string;
}

export default class Murphy extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      muiTheme: ThemeManager.getMuiTheme(require('./MurphyTheme')),
      tabIndex: '0',

      backup: new JobStatus(),
      backupSource: props.sources[props.sources.length - 1],
      backupArchive: props.archives[props.archives.length - 1],

      restore: new JobStatus(),
      restoreArchive: props.archives[props.archives.length - 1],
      restoreVersion: null,
      restoreDestination: null
    };

    this.registerIpcCallbacks();
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  getChildContext() {
    return {
      muiTheme: this.state.muiTheme
    };
  }

  private get styles() {
    const padding: number = Theme.spacing.desktopGutter;
    return {
      runButton: {
        position: 'fixed',
        right: padding,
        bottom: padding
      }
    };
  }

  private registerIpcCallbacks() {
    ipcRenderer.on('backup-progress', _.throttle((event, arg) => {
      this.setState({
        backup: _.extend(this.state.backup, {
          progress: arg.progress,
          progressMessage: arg.message
        })
      });
    }, 50));
    ipcRenderer.on('backup-complete', (event, arg) => {
      this.setState({
        backup: _.extend(this.state.backup, {
          isRunning: false
        })
      });
    });
    ipcRenderer.on('backup-error', (event, arg) => {
      this.setState({
        backup: _.extend(this.state.backup, {
          isRunning: false
        })
      });
      dialog.showErrorBox('Backup error', arg);
    });

    ipcRenderer.on('restore-progress', _.throttle((event, arg) => {
      this.setState({
        restore: _.extend(this.state.restore, {
          progress: arg.progress,
          progressMessage: arg.message
        })
      });
    }, 50));
    ipcRenderer.on('restore-complete', (event, arg) => {
      this.setState({
        restore: _.extend(this.state.restore, {
          isRunning: false
        })
      });
    });
    ipcRenderer.on('restore-error', (event, arg) => {
      this.setState({
        restore: _.extend(this.state.restore, {
          isRunning: false
        })
      });
      dialog.showErrorBox('Restore error', arg);
    });
  }

  private onStart() {
    if (this.state.tabIndex === '0') {
      this.onStartBackup();
    } else if (this.state.tabIndex === '1') {
      this.onStartRestore();
    }
  }

  private onStartBackup() {
    const newBackup = this.state.backup;
    newBackup.isRunning = true;
    newBackup.hasRun = true;
    this.setState({
      backup: newBackup
    });

    ipcRenderer.send('start-backup', {
      source: this.state.backupSource,
      destination: this.state.backupArchive
    });
  }

  private onStartRestore() {
    const newRestore = this.state.restore;
    newRestore.isRunning = true;
    newRestore.hasRun = true;
    this.setState({
      restore: newRestore
    });

    ipcRenderer.send('start-restore', {
      source: this.state.restoreArchive,
      version: { date: this.state.restoreVersion.date.valueOf() }, // serialize
      destination: this.state.restoreDestination
    });
  }

  private onTabChange(index) {
    this.setState({ tabIndex: index });
  }

  private onBackupSourceChange(newSource: Source) {
    this.setState({ backupSource: newSource });
  }

  private onBackupArchiveChange(newArchive: Archive) {
    this.setState({ backupArchive: newArchive });
  }

  private onRestoreArchiveChange(newArchive: Archive) {
    this.setState({ restoreArchive: newArchive });
  }

  private onRestoreVersionChange(newVersion: ArchiveVersion) {
    this.setState({ restoreVersion: newVersion });
  }

  private onRestoreDestinationChange(newDestination: string) {
    this.setState({ restoreDestination: newDestination });
  }

  private get isRunReady(): boolean {
    if (this.state.tabIndex === '0') {
      return !this.state.backup.isRunning && !!this.state.backupSource && !!this.state.backupArchive;
    } else if (this.state.tabIndex === '1') {
      return !this.state.restore.isRunning && !!this.state.restoreArchive && !!this.state.restoreVersion && !!this.state.restoreDestination;
    }
    return false;
  }

  render() {
    const backupCards = [
      <BackupConfig key="config" sources={this.props.sources} archives={this.props.archives}
        source={this.state.backupSource} archive={this.state.backupArchive}
        onSourceChange={this.onBackupSourceChange.bind(this)} onArchiveChange={this.onBackupArchiveChange.bind(this)} />
    ];
    if (this.state.backup.hasRun) {
      backupCards.push(<ProgressCard key="progress" progress={this.state.backup.progress} message={this.state.backup.progressMessage} />);
    }

    const restoreCards = [
      <RestoreConfig key="config" archives={this.props.archives}
        archive={this.state.restoreArchive} version={this.state.restoreVersion} destination={this.state.restoreDestination}
        onArchiveChange={this.onRestoreArchiveChange.bind(this)} onVersionChange={this.onRestoreVersionChange.bind(this)} onDestinationChange={this.onRestoreDestinationChange.bind(this)} />
    ];
    if (this.state.restore.hasRun) {
      restoreCards.push(<ProgressCard key="progress" progress={this.state.restore.progress} message={this.state.restore.progressMessage} />);
    }

    return (
      <div>
        <MUI.Tabs value={this.state.tabIndex} onChange={this.onTabChange.bind(this)}>
          <MUI.Tab label="BACKUP" value="0">
            <CardScroller cards={backupCards} />
          </MUI.Tab>
          <MUI.Tab label="RESTORE" value="1">
            <CardScroller cards={restoreCards} />
          </MUI.Tab>
        </MUI.Tabs>
        <MUI.FloatingActionButton style={this.styles.runButton} onClick={this.onStart.bind(this)} disabled={!this.isRunReady}>
          <MUI.SvgIcon color={this.isRunReady ? undefined : 'rgba(0, 0, 0, 0.3)'}>
            <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
          </MUI.SvgIcon>
        </MUI.FloatingActionButton>
      </div>
    );
  }
}
