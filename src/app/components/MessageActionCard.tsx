import * as React from 'react';
import * as MUI from 'material-ui';
// import Theme = require('./MurphyTheme');

interface Props {
  message: string;
  actionLabel: string;
  onClick?: () => any;
}

export default class MessageActionCard extends React.Component<Props, {}> {
  constructor(props: Props) {
    super(props);
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  private get styles() {
    // const padding: number = Theme.spacing.desktopGutter;
    return {
      container: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    };
  }

  render() {
    return (
      <div style={this.styles.container}>
        <div>{this.props.message}</div>
        <MUI.FlatButton label={this.props.actionLabel} onClick={this.props.onClick} />
      </div>
    );
  }
}
