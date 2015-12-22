import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Theme = require('./MurphyTheme');

interface Props {
  cards: React.ReactElement<any>[];
}

interface State {
}

export default class CardScroller extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  private get styles() {
    const padding: number = Theme.spacing.desktopGutter;
    return {
      tab: {
        overflow: 'visible'
      },
      card: {
        position: 'relative',
        margin: padding,
        padding: padding,
      }
    };
  }

  render() {
    const cardElements = [];
    this.props.cards.forEach((component, i) => {
      cardElements.push(
        <MUI.Paper key={i} style={this.styles.card}>
          {component}
        </MUI.Paper>
      );
    });

    return (
      <div style={this.styles.tab}>
        {cardElements}
      </div>
    );
  }
}
