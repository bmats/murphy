import * as React from 'react';
import MUI from 'material-ui';

interface Props {
  label: string;
  items: string[];
  value: number;
  onAdd?: () => any;
  onChange?: (name: string) => any;
}

interface State {
  selectedIndex: number;
}

export default class AddSelectField extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      selectedIndex: props.value
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    this.setState({
      selectedIndex: nextProps.value
    });
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  private onValueChange(e: MUI.TouchTapEvent, index: number) {
    if (index === this.props.items.length) {
      if (this.props.onAdd) this.props.onAdd();
    } else {
      this.setState({
        selectedIndex: index
      });
      if (this.props.onChange) this.props.onChange(this.props.items[index]);
    }
  }

  render() {
    const items = this.props.items.map((item, i) => <MUI.MenuItem key={i} primaryText={item} value={i} />);
    items.push(<MUI.MenuItem key={items.length} primaryText={'Add New ' + this.props.label} value={items.length} />);

    return (items.length > 1)
      ? <MUI.SelectField value={this.state.selectedIndex} onChange={this.onValueChange.bind(this)} labelStyle={{ paddingRight: 0 }}>
          {items}
        </MUI.SelectField>
      : <MUI.FlatButton label={'Add ' + this.props.label} onClick={this.props.onAdd} />;
  }
}
