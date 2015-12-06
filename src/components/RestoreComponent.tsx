import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';

interface Props {
}

interface State {
}

export default class RestoreComponent extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  render() {
    return (
      <div>
        <div>Restore goes gere</div>
        <MUI.RaisedButton label="Hiya" primary={true} />
      </div>
    );
  }
}