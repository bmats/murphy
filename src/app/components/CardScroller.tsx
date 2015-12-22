import * as _ from 'lodash';
import * as React from 'react';
const ReactDOM = require('react-dom');
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Theme = require('./MurphyTheme');

interface Props {
  cards: React.ReactElement<any>[];
}

interface State {
  height?: number;
}

export default class CardScroller extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const node = ReactDOM.findDOMNode(this);

    // Calculate the actual container height (for use in SwipeableView)
    let height = (node.childElementCount + 1) * Theme.spacing.desktopGutter;
    for (let i = 0; i < node.children.length; ++i) {
      height += node.children[i].clientHeight;
    }
    if (height !== this.state.height) {
      this.setState({ height: height });
    }
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
      <div style={_.extend(this.styles.tab, { height: this.state.height })}>
        {cardElements}
      </div>
    );
  }
}
