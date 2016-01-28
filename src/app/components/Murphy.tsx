import {remote, shell} from 'electron';
const dialog = remote.dialog;
import * as React from 'react';
import SwipeableViews from './SwipeableViewsMaxHeight';
import MUI from 'material-ui';
const MoreVertIcon = require('material-ui/lib/svg-icons/navigation/more-vert');
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Theme from './MurphyTheme';
import {Engine, Source, Archive, ArchiveVersion} from '../models';
import CardScroller from './CardScroller';
import BackupConfig from './BackupConfig';
import RestoreConfig from './RestoreConfig';
import ProgressCard from './ProgressCard';
import MessageActionCard from './MessageActionCard';
import Settings from './Settings';

interface Props {
  engine: Engine;
}

interface State {
  muiTheme?: MUI.Styles.MuiTheme;
  tabIndex?: number;
  isSettingsOpen?: boolean;

  backupSource?: Source;
  backupArchive?: Archive;

  restoreArchive?: Archive;
  restoreVersion?: ArchiveVersion;
  restoreDestination?: string;
}

export default class Murphy extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      muiTheme: ThemeManager.getMuiTheme(Theme),
      tabIndex: 0,
      isSettingsOpen: false,

      backupSource: props.engine.config.sources[props.engine.config.sources.length - 1],
      backupArchive: props.engine.config.archives[props.engine.config.archives.length - 1],

      restoreArchive: props.engine.config.archives[props.engine.config.archives.length - 1],
      restoreVersion: null,
      restoreDestination: null
    };

    // If a source/archive was added, use it in the UI
    props.engine.on('sourceAdded', newSource => this.setState({
      backupSource: newSource
    }));
    props.engine.on('archiveAdded', newArchive => this.setState({
      backupArchive: newArchive,
      restoreArchive: newArchive
    }));

    // Prompt before closing if a job is running
    window.onbeforeunload = (e) => {
      if (this.props.engine.backupJob.isRunning || this.props.engine.restoreJob.isRunning) {
        const result = dialog.showMessageBox(remote.BrowserWindow.getFocusedWindow(), {
          type: 'warning',
          buttons: ['Close', 'Cancel'],
          title: 'Murphy',
          message: 'Are you sure you want to close Murphy?\nThis will stop your ' +
            (this.props.engine.backupJob.isRunning ? 'backup' : 'restore') + '.'
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

  private onStart() {
    if (this.state.tabIndex === 0) {
      this.onStartBackup();
    } else if (this.state.tabIndex === 1) {
      this.onStartRestore();
    }
  }

  private onStartBackup() {
    this.props.engine.backupJob.start(this.state.backupSource, this.state.backupArchive);
  }

  private onStartRestore() {
    this.props.engine.restoreJob.start(this.state.restoreArchive, this.state.restoreVersion, this.state.restoreDestination);
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
    this.props.engine.openArchive(this.state.backupArchive);
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
      return !this.props.engine.backupJob.isRunning && !!this.state.backupSource && !!this.state.backupArchive;
    } else if (this.state.tabIndex === 1) {
      return !this.props.engine.restoreJob.isRunning && !!this.state.restoreArchive && !!this.state.restoreVersion &&
        !!this.state.restoreDestination;
    }
    return false;
  }

  render() {
    const backupJob = this.props.engine.backupJob, restoreJob = this.props.engine.restoreJob;

    const backupCards = [
      <BackupConfig key="config" engine={this.props.engine}
        source={this.state.backupSource} archive={this.state.backupArchive}
        onSourceChange={this.onBackupSourceChange.bind(this)} onArchiveChange={this.onBackupArchiveChange.bind(this)} />
    ];
    if (backupJob.hasRun) {
      backupCards.push(<ProgressCard key="progress" progress={backupJob.progress}
        message={backupJob.progressMessage} error={backupJob.hasError} />);
    }
    if (backupJob.hasRun && !backupJob.isRunning && !backupJob.hasError) {
      const backupResultMessage = backupJob.result.count +
        ' file change' + (backupJob.result.count !== 1 ? 's' : '') + ' backed up.';
      backupCards.push(<MessageActionCard message={backupResultMessage}
        actionLabel="Open Backup Folder" onClick={this.onOpenBackup.bind(this)} />);
    }

    const restoreCards = [
      <RestoreConfig key="config" engine={this.props.engine} archive={this.state.restoreArchive}
        version={this.state.restoreVersion} destination={this.state.restoreDestination}
        onArchiveChange={this.onRestoreArchiveChange.bind(this)} onVersionChange={this.onRestoreVersionChange.bind(this)}
        onDestinationChange={this.onRestoreDestinationChange.bind(this)} />
    ];
    if (restoreJob.hasRun) {
      restoreCards.push(<ProgressCard key="progress" progress={restoreJob.progress}
        message={restoreJob.progressMessage} error={restoreJob.hasError} />);
    }
    if (restoreJob.hasRun && !restoreJob.isRunning && !restoreJob.hasError) {
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
        <Settings engine={this.props.engine} open={this.state.isSettingsOpen} onClose={this.onCloseSettings.bind(this)} />
      </div>
    );
  }
}
