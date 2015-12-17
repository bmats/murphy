import * as React from 'react';
import * as MUI from 'material-ui';

interface Props {
  width: number,
  verticalMargin: number,
  direction?: string,
  color?: string
}

export default class VerticalSeparator extends React.Component<Props, {}> {
  constructor(props: Props) {
    super(props);
  }

  static get defaultProps() {
    return {
      color: MUI.Styles.Colors.grey300
    };
  }

  private get styles() {
    return {
      separator: {
        position: 'absolute',
        top: 0,
        left: '50%',
        width: this.props.width,
        height: '100%',
        marginLeft: -this.props.width / 2
      },
      line: {
        position: 'absolute',
        top: this.props.verticalMargin,
        left: this.props.width / 2,
        bottom: this.props.verticalMargin,
        borderLeft: `1px solid ${this.props.color}`
      },
      icon: {
        display: this.props.direction ? 'block' : 'none',
        transform: this.props.direction === 'left' ? 'scale(-1)' : null,
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -12,
        marginTop: -12,
        fill: this.props.color,
        background: 'white'
      }
    };
  }

  render() {
    return (
      <div style={this.styles.separator}>
        <div style={this.styles.line}></div>
        <MUI.SvgIcon style={this.styles.icon}>
          <path d="M23.25 12l-11.25-11.25v6.75h-12v9h12v6.75z"></path>
        </MUI.SvgIcon>
      </div>
    );
  }
}
