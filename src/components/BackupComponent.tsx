import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Theme = require('./MurphyTheme');
import Source from '../engine/Source';
import SourceSelect from './SourceSelect';
import VerticalSeparator from './VerticalSeparator';

interface Props {
  sources: Source[],
  selectedSource: Source
}

interface State {
}

export default class BackupComponent extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  private get styles() {
    const padding: number = Theme.spacing.desktopGutter;
    return {
      leftSide: {
        display: 'inline-block',
        width: '50%',
        padding: padding,
        paddingRight: 10 + padding,
        boxSizing: 'border-box',
        textAlign: 'center'
      },
      rightSide: {
        display: 'inline-block',
        width: '50%',
        padding: padding,
        paddingLeft: 10 + padding,
        boxSizing: 'border-box',
        textAlign: 'center'
      },
      submitButton: {
      }
    };
  }

  render() {
    return (
      <div style={{height: '100%'}}>
        <div style={this.styles.leftSide}>
          <h2>What</h2>
          <SourceSelect sources={this.props.sources} defaultSource={this.props.selectedSource} />
        </div>
        <VerticalSeparator width={20} verticalMargin={Theme.spacing.desktopGutter} />
        <div style={this.styles.rightSide}>
          <h2>Where</h2>
          <SourceSelect sources={this.props.sources} defaultSource={this.props.selectedSource} />
        </div>
        <MUI.RaisedButton label="Start Backup" primary disabled style={this.styles.submitButton} />
      </div>
    );
  }
}
