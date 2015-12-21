import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Backup from './Backup';
import Restore from './Restore';
import {Source, Archive} from '../models';

interface Props {
  sources: Source[];
  archives: Archive[];
}

interface State {
  muiTheme: MUI.Styles.MuiTheme;
}

export default class Murphy extends React.Component<Props, State> {
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
          <Backup sources={this.props.sources} archives={this.props.archives} />
        </MUI.Tab>
        <MUI.Tab label="RESTORE">
          <Restore archives={this.props.archives} />
        </MUI.Tab>
      </MUI.Tabs>
    );
  }
}
