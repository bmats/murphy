import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Menu = require('material-ui/lib/menu/menu');
import Source from '../engine/Source';

interface Props {
  sources: Source[]
  defaultSource: Source
  onAdd?: (name: string) => void
}

interface State {
  selected: Source
}

export default class SourceSelect extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      selected: props.defaultSource
    };
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  render() {
    const index: number = this.props.sources.indexOf(this.state.selected);
    const items: any[] = this.props.sources.map((e: Source, i: number) => {
      return {
        text: e.name,
        payload: i
      };
    })
    return (
      <div>
        <MUI.SelectField value={index} menuItems={items} onChange={this._handleValueChange.bind(this)} />
      </div>
    );
  }

  private _handleValueChange(e: MUI.TouchTapEvent, index: number, menuItem: Source) {
    this.setState({
      selected: this.props.sources[index]
    });
  }
}
