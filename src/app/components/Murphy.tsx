import {remote, ipcRenderer, shell} from 'electron';
const dialog = remote.require('dialog');
import * as _ from 'lodash';
import * as React from 'react';
import SwipeableViews from './SwipeableViewsMaxHeight';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Theme = require('./MurphyTheme');
import {Source, Archive, ArchiveVersion} from '../models';
import CardScroller from './CardScroller';
import BackupConfig from './BackupConfig';
import RestoreConfig from './RestoreConfig';
import ProgressCard from './ProgressCard';
import MessageActionCard from './MessageActionCard';

interface Props {
  sources: Source[];
  archives: Archive[];
}

interface State {
  muiTheme?: MUI.Styles.MuiTheme;
  tabIndex?: number;

  backup?: JobStatus;
  backupSource?: Source;
  backupArchive?: Archive;
  backupStats?: { count: number };

  restore?: JobStatus;
  restoreArchive?: Archive;
  restoreVersion?: ArchiveVersion;
  restoreDestination?: string;
}

class JobStatus {
  isRunning: boolean = false;
  hasRun: boolean = false;
  hasError: boolean = false;
  progress: number = 0;
  progressMessage: string = null;
}

export default class Murphy extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      muiTheme: ThemeManager.getMuiTheme(require('./MurphyTheme')),
      tabIndex: 0,

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
      container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      },
      tabs: {
      },
      tabView: {
        flexGrow: 1
      },
      runButton: {
        position: 'fixed',
        right: padding,
        bottom: padding
      }
    };
  }

  private registerIpcCallbacks() {
    ipcRenderer.on('backup-progress', _.throttle((event, arg) => {
      if (this.state.backup.hasError) return;

      this.setState({
        backup: _.extend(this.state.backup, {
          progress: arg.progress,
          progressMessage: arg.message
        })
      });
    }, 200));
    ipcRenderer.on('backup-complete', (event, arg) => {
      this.setState({
        backup: _.extend(this.state.backup, {
          isRunning: false
        }),
        backupStats: arg.stats
      });
    });
    ipcRenderer.on('backup-error', (event, arg) => {
      this.setState({
        backup: _.extend(this.state.backup, {
          isRunning: false,
          hasError: true,
          progressMessage: arg
        })
      });
      dialog.showErrorBox('Backup error', arg);
    });

    ipcRenderer.on('restore-progress', _.throttle((event, arg) => {
      if (this.state.restore.hasError) return;

      this.setState({
        restore: _.extend(this.state.restore, {
          progress: arg.progress,
          progressMessage: arg.message
        })
      });
    }, 200));
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
          isRunning: false,
          hasError: true,
          progressMessage: arg
        })
      });
      dialog.showErrorBox('Restore error', arg);
    });
  }

  private onStart() {
    if (this.state.tabIndex === 0) {
      this.onStartBackup();
    } else if (this.state.tabIndex === 1) {
      this.onStartRestore();
    }
  }

  private onStartBackup() {
    const newBackup = this.state.backup;
    newBackup.isRunning = true;
    newBackup.hasRun = true;
    newBackup.hasError = false;
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
    newRestore.hasError = false;
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
    this.setState({ tabIndex: Number(index) });
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

  private onOpenBackup() {
    ipcRenderer.send('open-archive', this.state.backupArchive);
  }

  private onOpenRestore() {
    shell.openItem(this.state.restoreDestination);
  }

  private get isRunReady(): boolean {
    if (this.state.tabIndex === 0) {
      return !this.state.backup.isRunning && !!this.state.backupSource && !!this.state.backupArchive;
    } else if (this.state.tabIndex === 1) {
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
      backupCards.push(<ProgressCard key="progress" progress={this.state.backup.progress}
        message={this.state.backup.progressMessage} error={this.state.backup.hasError} />);
    }
    if (this.state.backup.hasRun && !this.state.backup.isRunning && !this.state.backup.hasError) {
      const backupResultMessage = this.state.backupStats.count +
        ' file change' + (this.state.backupStats.count !== 1 ? 's' : '') + ' backed up.';
      backupCards.push(<MessageActionCard message={backupResultMessage}
        actionLabel="Open Backup Folder" onClick={this.onOpenBackup.bind(this)} />);
    }

    const restoreCards = [
      <RestoreConfig key="config" archives={this.props.archives}
        archive={this.state.restoreArchive} version={this.state.restoreVersion} destination={this.state.restoreDestination}
        onArchiveChange={this.onRestoreArchiveChange.bind(this)} onVersionChange={this.onRestoreVersionChange.bind(this)} onDestinationChange={this.onRestoreDestinationChange.bind(this)} />
    ];
    if (this.state.restore.hasRun) {
      restoreCards.push(<ProgressCard key="progress" progress={this.state.restore.progress} message={this.state.restore.progressMessage} error={this.state.restore.hasError} />);
    }
    if (this.state.restore.hasRun && !this.state.restore.isRunning && !this.state.restore.hasError) {
      restoreCards.push(<MessageActionCard message="Restore completed."
        actionLabel="Open Restore Folder" onClick={this.onOpenRestore.bind(this)} />);
    }

    return (
      <div style={this.styles.container}>
        <MUI.Tabs value={this.state.tabIndex + ''} onChange={this.onTabChange.bind(this)} style={this.styles.tabs}>
          <MUI.Tab label="BACKUP" value="0" />
          <MUI.Tab label="RESTORE" value="1" />
        </MUI.Tabs>
        <SwipeableViews index={this.state.tabIndex} onChangeIndex={this.onTabChange.bind(this)} style={this.styles.tabView}>
          <CardScroller cards={backupCards} />
          <CardScroller cards={restoreCards} />
        </SwipeableViews>
        <MUI.FloatingActionButton style={this.styles.runButton} onClick={this.onStart.bind(this)} disabled={!this.isRunReady}>
          <MUI.SvgIcon color={this.isRunReady ? undefined : 'rgba(0, 0, 0, 0.3)'}>
            <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
          </MUI.SvgIcon>
        </MUI.FloatingActionButton>
      </div>
    );
  }
}
