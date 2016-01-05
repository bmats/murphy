import * as _ from 'lodash';
import * as React from 'react';
const ReactDOM = require('react-dom');
import MUI from 'material-ui';
import ThemeManager from 'material-ui/lib/styles/theme-manager';
import Theme from './MurphyTheme';

interface Props {
  cards: React.ReactElement<any>[];
}

export default class CardScroller extends React.Component<Props, {}> {
  constructor(props: Props) {
    super(props);

    this.state = {};
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
      cardSpacer: {
        height: padding
      },
      card: {
        position: 'relative',
        margin: `0 ${padding}px`,
        padding: padding,
      }
    };
  }

  render() {
    const cardElements = [];
    this.props.cards.forEach((component, i) => {
      cardElements.push(<div key={`spacer-${i}`} style={this.styles.cardSpacer}></div>);
      cardElements.push(
        <MUI.Paper key={i} style={this.styles.card}>
          {component}
        </MUI.Paper>
      );
    });
    cardElements.push(<div key="spacer-last" style={this.styles.cardSpacer}></div>);

    return (
      <div style={this.styles.tab}>
        {cardElements}
      </div>
    );
  }
}
