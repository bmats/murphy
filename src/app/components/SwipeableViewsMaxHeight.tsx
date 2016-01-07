/**
 * Fork of react-swipeable-views with some changes to make each view use max height.
 * Based on https://github.com/oliviertassinari/react-swipeable-views
 * License: MIT
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import {Motion, spring} from 'react-motion';

const styles = {
  root: {
    overflowX: 'hidden',
  },
  container: {
    display: 'flex',
  },
  slide: {
    width: '100%',
    flexShrink: 0,
    overflow: 'auto',
  },
};

const resistanceCoef = 0.7;

const SwipeableViewsMaxHeight = React.createClass({
  propTypes: {
    children: React.PropTypes.node,

    /**
     * If true, it will disable touch events.
     * This is useful when you want to prohibit the user from changing slides.
     */
    disabled: React.PropTypes.bool,

    /**
     * This is the index of the slide to show.
     * This is useful when you want to change the default slide shown.
     * Or when you have tabs linked to each slide.
     */
    index: React.PropTypes.number,

    /**
     * This is callback prop. It's call by the
     * component when the shown slide change after a swipe made by the user.
     * This is useful when you have tabs linked to each slide.
     */
    onChangeIndex: React.PropTypes.func,

    /**
     * This is callback prop. It's called by the
     * component when the slide switching.
     * This is useful when you want to implement something corresponding to the current slide position.
     */
    onSwitching: React.PropTypes.func,

    /**
     * If true, it will add bounds effect on the edges.
     */
    resistance: React.PropTypes.bool,

    /**
     * This is the inlined style that will be applied
     * to each slide container.
     */
    style: React.PropTypes.object,

    /**
     * This is the threshold used for detecting a quick swipe.
     * If the computed speed is above this value, the index change.
     */
    threshold: React.PropTypes.number,
  },
  mixins: [
    PureRenderMixin,
  ],
  getDefaultProps() {
    return {
      index: 0,
      threshold: 5,
      resistance: false,
      disabled: false,
    };
  },
  getInitialState() {
    return {
      index: this.props.index,
      indexLatest: this.props.index,
      isDragging: false,
      isFirstRender: true,
    };
  },
  componentDidMount() {
    this.setState({
      isFirstRender: false,
    });
  },
  componentWillReceiveProps(nextProps) {
    const {
      index,
    } = nextProps;

    if (typeof index === 'number' && index !== this.props.index) {
      this.setState({
        index: index,
        indexLatest: index,
      });
    }
  },
  handleTouchStart(event) {
    const touch = event.touches[0];

    this.startWidth = ReactDOM.findDOMNode(this).getBoundingClientRect().width;
    this.startIndex = this.state.index;
    this.startX = touch.pageX;
    this.lastX = touch.pageX;
    this.deltaX = 0;
    this.startY = touch.pageY;
    this.isScrolling = undefined;
  },
  handleTouchMove(event) {
    const touch = event.touches[0];

    // This is a one time test
    if (this.isScrolling === undefined) {
      this.isScrolling = Math.abs(this.startY - touch.pageY) > Math.abs(this.startX - touch.pageX);
    }

    if (this.isScrolling) {
      return;
    }

    // Prevent native scrolling
    event.preventDefault();

    this.deltaX = this.deltaX * 0.5 + (touch.pageX - this.lastX) * 0.5;
    this.lastX = touch.pageX;

    const indexMax = React.Children.count(this.props.children) - 1;

    let index = this.startIndex + (this.startX - touch.pageX) / this.startWidth;

    if (!this.props.resistance) {
      if (index < 0) {
        index = 0;
        this.startX = touch.pageX;
      } else if (index > indexMax) {
        index = indexMax;
        this.startX = touch.pageX;
      }
    } else {
      if (index < 0) {
        index = Math.exp(index * resistanceCoef) - 1;
      } else if (index > indexMax) {
        index = indexMax + 1 - Math.exp((indexMax - index) * resistanceCoef);
      }
    }

    if (this.props.onSwitching) {
      this.props.onSwitching(index);
    }

    this.setState({
      isDragging: true,
      index: index,
    });
  },
  handleTouchEnd() {
    if (this.isScrolling) {
      return;
    }

    let indexNew;

    // Quick movement
    if (Math.abs(this.deltaX) > this.props.threshold) {
      if (this.deltaX > 0) {
        indexNew = Math.floor(this.state.index);
      } else {
        indexNew = Math.ceil(this.state.index);
      }
    } else {
      // Some hysteresis with startIndex
      if (Math.abs(this.startIndex - this.state.index) > 0.6) {
        indexNew = Math.round(this.state.index);
      } else {
        indexNew = this.startIndex;
      }
    }

    const indexMax = React.Children.count(this.props.children) - 1;

    if (indexNew < 0) {
      indexNew = 0;
    } else if (indexNew > indexMax) {
      indexNew = indexMax;
    }

    this.setState({
      index: indexNew,
      indexLatest: indexNew,
      isDragging: false,
    });

    if (this.props.onSwitching) {
      this.props.onSwitching(indexNew);
    }

    if (this.props.onChangeIndex && indexNew !== this.startIndex) {
      this.props.onChangeIndex(indexNew, this.startIndex);
    }
  },
  renderContainer(interpolatedStyle) {
    const {
      children,
    } = this.props;

    const {
      isFirstRender,
    } = this.state;

    let childrenToRender;

    childrenToRender = React.Children.map(children, (element, i) => {
      if (isFirstRender && i > 0) {
        return null;
      }

      return (
        <div style={styles.slide}>
          {element}
        </div>
      );
    });

    const translate = -interpolatedStyle.translate;

    return (
      <div style={Object.assign({
        WebkitTransform: `translate3d(${translate}%, 0, 0)`,
        transform: `translate3d(${translate}%, 0, 0)`,
      }, styles.container)}>
        {childrenToRender}
      </div>
    );
  },
  render() {
    const {
      disabled,
      style,
    } = this.props;

    const {
      index,
      isDragging,
    } = this.state;

    const translate = index * 100;

    const motionStyle = isDragging ? {
      translate: translate,
    } : {
      translate: spring(translate, [300, 30]),
    };

    const touchEvents = disabled ? {} : {
      onTouchStart: this.handleTouchStart,
      onTouchMove: this.handleTouchMove,
      onTouchEnd: this.handleTouchEnd,
    };

    return (
      <div style={Object.assign(styles.root, style)} {...touchEvents}>
        <Motion style={motionStyle}>
          {interpolatedStyle => this.renderContainer(interpolatedStyle)}
        </Motion>
      </div>
    );
  },
});

export default SwipeableViewsMaxHeight;
