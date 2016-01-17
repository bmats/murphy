import {remote, ipcRenderer, shell} from 'electron';
const dialog = remote.dialog;
import * as React from 'react';
import SwipeableViews from './SwipeableViewsMaxHeight';
import MUI from 'material-ui';
import MoreVertIcon from 'material-ui/lib/svg-icons/navigation/more-vert';
import ThemeManager from 'material-ui/lib/styles/theme-manager';
import Theme from './MurphyTheme';
import {Config, Source, Archive, ArchiveVersion} from '../models';
import CardScroller from './CardScroller';
import BackupConfig from './BackupConfig';
import RestoreConfig from './RestoreConfig';
import ProgressCard from './ProgressCard';
import MessageActionCard from './MessageActionCard';
import Settings from './Settings';

interface Props {
  config: Config;
}

interface State {
  muiTheme?: MUI.Styles.MuiTheme;
  tabIndex?: number;
  isSettingsOpen?: boolean;

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
      muiTheme: ThemeManager.getMuiTheme(Theme),
      tabIndex: 0,
      isSettingsOpen: false,

      backup: new JobStatus(),
      backupSource: props.config.sources[props.config.sources.length - 1],
      backupArchive: props.config.archives[props.config.archives.length - 1],

      restore: new JobStatus(),
      restoreArchive: props.config.archives[props.config.archives.length - 1],
      restoreVersion: null,
      restoreDestination: null
    };

    this.registerIpcCallbacks();

    // Prompt before closing if a job is running
    window.onbeforeunload = (e) => {
      if (this.state.backup.isRunning || this.state.restore.isRunning) {
        const result = dialog.showMessageBox(remote.BrowserWindow.getFocusedWindow(), {
          type: 'warning',
          buttons: ['Close', 'Cancel'],
          title: 'Murphy',
          message: 'Are you sure you want to close Murphy?\nThis will stop your ' +
            (this.state.backup.isRunning ? 'backup' : 'restore') + '.'
        });
        e.returnValue = (result === 0); // 'Close' button
      }
    };
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
        marginRight: 48
      },
      menuButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        background: Theme.palette.primary1Color
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
    ipcRenderer.on('backup-progress', (event, arg) => {
      if (this.state.backup.hasError) return;

      this.setState({
        backup: Object.assign({}, this.state.backup, {
          progress: arg.progress,
          progressMessage: arg.message
        })
      });
    });
    ipcRenderer.on('backup-complete', (event, arg) => {
      this.setState({
        backup: Object.assign({}, this.state.backup, {
          isRunning: false
        }),
        backupStats: arg.stats
      });
    });
    ipcRenderer.on('backup-error', (event, arg) => {
      this.setState({
        backup: Object.assign({}, this.state.backup, {
          isRunning: false,
          hasError: true,
          progressMessage: arg
        })
      });
      dialog.showErrorBox('Backup error', arg);
    });

    ipcRenderer.on('restore-progress', (event, arg) => {
      if (this.state.restore.hasError) return;

      this.setState({
        restore: Object.assign({}, this.state.restore, {
          progress: arg.progress,
          progressMessage: arg.message
        })
      });
    });
    ipcRenderer.on('restore-complete', (event, arg) => {
      this.setState({
        restore: Object.assign({}, this.state.restore, {
          isRunning: false
        })
      });
    });
    ipcRenderer.on('restore-error', (event, arg) => {
      this.setState({
        restore: Object.assign({}, this.state.restore, {
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

  private onOpenSettings() {
    this.setState({ isSettingsOpen: true });
  }

  private onCloseSettings() {
    this.setState({ isSettingsOpen: false });
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
      <BackupConfig key="config" sources={this.props.config.sources} archives={this.props.config.archives}
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
      <RestoreConfig key="config" archives={this.props.config.archives}
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
        <MUI.IconMenu desktop style={this.styles.menuButton}
            iconButtonElement={<MUI.IconButton><MoreVertIcon color={Theme.palette.alternateTextColor} /></MUI.IconButton>}>
          <MUI.MenuItem primaryText="Settings" index={0} onTouchTap={this.onOpenSettings.bind(this)} />
        </MUI.IconMenu>
        <SwipeableViews index={this.state.tabIndex} onChangeIndex={this.onTabChange.bind(this)} style={this.styles.tabView}>
          <CardScroller cards={backupCards} />
          <CardScroller cards={restoreCards} />
        </SwipeableViews>
        <MUI.FloatingActionButton style={this.styles.runButton} onTouchTap={this.onStart.bind(this)} disabled={!this.isRunReady}>
          <MUI.SvgIcon color={this.isRunReady ? undefined : 'rgba(0, 0, 0, 0.3)'}>
            <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
          </MUI.SvgIcon>
        </MUI.FloatingActionButton>
        <Settings open={this.state.isSettingsOpen} onClose={this.onCloseSettings.bind(this)}
          fileRegExps={this.props.config.fileRegExps} isRegExpEnabled={!!this.props.config.ui.isRegExpEnabled} />
      </div>
    );
  }
}
