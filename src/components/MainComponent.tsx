import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import BackupComponent from './BackupComponent';
import RestoreComponent from './RestoreComponent';
import Archive from '../engine/Archive';
import Source from '../engine/Source';

interface Props {
  sources: Source[];
  archives: Archive[];
}

interface State {
  muiTheme: MUI.Styles.MuiTheme;
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
          <BackupComponent sources={this.props.sources} archives={this.props.archives} />
        </MUI.Tab>
        <MUI.Tab label="RESTORE">
          <RestoreComponent />
        </MUI.Tab>
      </MUI.Tabs>
    );
  }
}
