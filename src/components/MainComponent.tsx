import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import BackupComponent from './BackupComponent';
import RestoreComponent from './RestoreComponent';
import Source from '../engine/Source';

interface Props {
  backupSources: Source[],
  selectedBackupSource: Source
}

interface State {
  muiTheme: MUI.Styles.MuiTheme
}

export default class MainComponent extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      muiTheme: ThemeManager.getMuiTheme(require('./MurphyTheme'))
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

  render() {
    return (
      <MUI.Tabs>
        <MUI.Tab label="BACKUP">
          <BackupComponent sources={this.props.backupSources} selectedSource={this.props.selectedBackupSource} />
        </MUI.Tab>
        <MUI.Tab label="RESTORE">
          <RestoreComponent />
        </MUI.Tab>
      </MUI.Tabs>
    );
  }
}
