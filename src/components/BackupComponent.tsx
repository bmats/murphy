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
      card: {
        position: 'relative',
        margin: padding,
        padding: padding,
      },
      leftSide: {
        display: 'inline-block',
        width: '50%',
        paddingRight: 10 + padding,
        boxSizing: 'border-box',
        textAlign: 'center'
      },
      rightSide: {
        display: 'inline-block',
        width: '50%',
        paddingLeft: 10 + padding,
        boxSizing: 'border-box',
        textAlign: 'center'
      },
      heading: {
        fontSize: 24,
        fontWeight: 400,
        marginTop: 0
      },
      headingCaption: {
        display: 'block',
        fontWeight: 400,
        marginTop: 8,
        fontSize: 13
      },
      submitButton: {
        position: 'fixed',
        right: padding,
        bottom: padding
      }
    };
  }

  render() {
    return (
      <div style={{height: '100%'}}>
        <MUI.Paper style={this.styles.card}>
          <div style={this.styles.leftSide}>
            <h2 style={this.styles.heading}>
              What
              <small style={this.styles.headingCaption}>What folders should I back up?</small>
            </h2>
            <SourceSelect sources={this.props.sources} defaultSource={this.props.selectedSource} />
          </div>
          <VerticalSeparator width={20} verticalMargin={Theme.spacing.desktopGutter} />
          <div style={this.styles.rightSide}>
            <h2 style={this.styles.heading}>
              Where
              <small style={this.styles.headingCaption}>Where should I back them up?</small>
            </h2>
            <SourceSelect sources={this.props.sources} defaultSource={this.props.selectedSource} />
          </div>
        </MUI.Paper>
        <MUI.Paper style={this.styles.card}>
          <MUI.LinearProgress mode="determinate" value={60} />
          <div>Status goes here</div>
        </MUI.Paper>
        <MUI.FloatingActionButton style={this.styles.submitButton}>
          <MUI.SvgIcon>
            <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
          </MUI.SvgIcon>
        </MUI.FloatingActionButton>
      </div>
    );
  }
}
