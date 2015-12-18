import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Menu = require('material-ui/lib/menu/menu');

interface Props {
  label: string;
  items: string[];
  onAdd?: () => void;
}

interface State {
  selectedIndex: number;
}

export default class AddSelectField extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      selectedIndex: 0
    };
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  render() {
    const items: {text: string; payload: number}[] = this.props.items.map((item, i) => {
      return {
        text: item,
        payload: i
      };
    });
    items.push({
      text: 'Add New ' + this.props.label,
      payload: items.length
    });
    return items.length > 1
      ? <MUI.SelectField value={this.state.selectedIndex} menuItems={items} onChange={this._handleValueChange.bind(this)} />
      : <MUI.FlatButton label={'Add ' + this.props.label} onClick={this.props.onAdd} />;
  }

  private _handleValueChange(e: MUI.TouchTapEvent, index: number, menuItem: {}) {
    if (index === this.props.items.length) {
      if (this.props.onAdd) this.props.onAdd();
    } else {
      this.setState({
        selectedIndex: index
      });
    }
  }
}