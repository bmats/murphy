import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';

interface Props {
}

interface State {
}

export default class Restore extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  render() {
    return (
      <div>
        <MUI.RaisedButton label="Implement" primary={true} />
      </div>
    );
  }
}
