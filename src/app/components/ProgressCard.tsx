import * as React from 'react';
import * as MUI from 'material-ui';
import Theme = require('./MurphyTheme');

interface Props {
  progress: number;
  message: string;
  error: boolean;
}

export default class ProgressCard extends React.Component<Props, {}> {
  constructor(props: Props) {
    super(props);
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  private get styles() {
    const padding: number = Theme.spacing.desktopGutter;
    return {
      progressMessage: {
        fontSize: 14,
        marginTop: padding / 2
      },
      error: {
        color: 'red'
      }
    };
  }

  render() {
    return (
      <div>
        <MUI.LinearProgress mode="determinate" value={this.props.progress * 100} color={this.props.error ? '#F44336' : undefined} />
        <div style={this.styles.progressMessage}>{this.props.message}</div>
      </div>
    );
  }
}
