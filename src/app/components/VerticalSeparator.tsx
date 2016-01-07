import * as React from 'react';
import MUI from 'material-ui';

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
      color: MUI.Styles.Colors.grey400
    };
  }

  private get styles() {
    return {
      separator: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      },
      icon: {
        display: this.props.direction ? 'block' : 'none',
        transform: this.props.direction === 'left' ? 'scale(-1)' : undefined,
        fill: this.props.color,
      },
    };
  }

  render() {
    return (
      <div style={this.styles.separator}>
        <MUI.SvgIcon style={this.styles.icon}>
          <path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z" />
        </MUI.SvgIcon>
      </div>
    );
  }
}
