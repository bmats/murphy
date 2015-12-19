import * as React from 'react';
import * as MUI from 'material-ui';

interface Props {
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
        width: 1,
        height: '100%'
      },
      line: {
        position: 'absolute',
        top: this.props.verticalMargin,
        left: 0,
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
          <path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z" />
        </MUI.SvgIcon>
      </div>
    );
  }
}
