import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Menu = require('material-ui/lib/menu/menu');
import Source from '../engine/Source';

interface Props {
  sources: Source[];
  onAdd?: () => void;
}

interface State {
  selectedIndex: number;
}

export default class SourceSelect extends React.Component<Props, State> {
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
    const items: {text: string; payload: number}[] = this.props.sources.map((e: Source, i: number) => {
      return {
        text: e.name,
        payload: i
      };
    });
    items.push({
      text: 'Add Folders',
      payload: items.length
    });
    return items.length > 1
      ? <MUI.SelectField value={this.state.selectedIndex} menuItems={items} onChange={this._handleValueChange.bind(this)} />
      : <MUI.FlatButton label="Add Folders" onClick={this.props.onAdd} />;
  }

  private _handleValueChange(e: MUI.TouchTapEvent, index: number, menuItem: {}) {
    if (index === this.props.sources.length) {
      if (this.props.onAdd) this.props.onAdd();
    } else {
      this.setState({
        selectedIndex: index
      });
    }
  }
}
