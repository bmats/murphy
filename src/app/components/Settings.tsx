import {ipcRenderer} from 'electron';
import * as _ from 'lodash';
import * as React from 'react';
import * as MUI from 'material-ui';
import Theme = require('./MurphyTheme');
import {Source, Archive, ArchiveVersion} from '../models';

interface Props {
  open: boolean;
  onClose?: () => any;
  style?: {};

  fileRegExps: string[];
  isRegExpEnabled: boolean;
}

interface State {
  fileRegExps?: string[];
  regExpError?: string;
  isRegExpEnabled?: boolean;
}

function escapeRegExp(str) {
  // See http://stackoverflow.com/a/6969486/1248884
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

function unescapeRegExp(str) {
  return str.replace(/\\([\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|])/g, '$1');
}

function validateRegExps(regexps: string[]): string {
  try {
    regexps.forEach(pattern => new RegExp(pattern))
    return null;
  } catch (e) {
    return e.message;
  }
}

export default class Settings extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      fileRegExps: props.fileRegExps,
      regExpError: null,
      isRegExpEnabled: props.isRegExpEnabled
    };
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  private get styles() {
    const padding: number = Theme.spacing.desktopGutter;
    return {
      container: {
        padding: padding
      }
    };
  }

  private onFileRegexChange(e) {
    let regexps = e.target.value.split('\n');
    if (!this.state.isRegExpEnabled) {
      regexps = regexps.map(pattern => escapeRegExp(pattern));
    }

    // Validate regex
    let error = null;
    if (this.state.isRegExpEnabled) {
      error = validateRegExps(regexps);
    }

    this.setState({
      fileRegExps: regexps,
      regExpError: error
    });
  }

  private onRegExpEnabledCheck(e) {
    let newFileRegExps: string[];
    if (e.target.checked) {
      // Unescape state
      newFileRegExps = this.state.fileRegExps.map(p => unescapeRegExp(p));
    } else {
      // Escape state
      newFileRegExps = this.state.fileRegExps.map(p => escapeRegExp(p));
    }

    // Validate regex
    let error = null;
    if (e.target.checked) {
      error = validateRegExps(newFileRegExps);
    }

    this.setState({
      fileRegExps: newFileRegExps,
      regExpError: error,
      isRegExpEnabled: e.target.checked
    });
  }

  private onSave() {
    ipcRenderer.send('update-config', {
      fileRegExps: this.state.fileRegExps,
      ui: {
        isRegExpEnabled: this.state.isRegExpEnabled
      }
    });
    if (this.props.onClose) this.props.onClose();
  }

  private onCancel() {
    if (this.props.onClose) this.props.onClose();
  }

  render() {
    let defaultFileRegExpValues = this.props.fileRegExps;
    if (!this.state.isRegExpEnabled) {
      defaultFileRegExpValues = defaultFileRegExpValues.map(pattern => unescapeRegExp(pattern));
    }

    const hasError = !!this.state.regExpError;

    const actions = [
      <MUI.FlatButton label="Cancel" secondary onTouchTap={this.onCancel.bind(this)} />,
      <MUI.FlatButton label="Save" primary onTouchTap={this.onSave.bind(this)} disabled={hasError} />
    ];
    return (
      <MUI.Dialog title="Settings" actions={actions} modal={true} open={this.props.open}>
        <MUI.TextField floatingLabelText="Files names to ignore" hintText="Text to look for in file names" multiLine fullWidth
          errorText={this.state.regExpError} defaultValue={defaultFileRegExpValues.join('\n')} onChange={this.onFileRegexChange.bind(this)} />
        <MUI.Checkbox label="Enable regular expressions" defaultChecked={this.props.isRegExpEnabled} onCheck={this.onRegExpEnabledCheck.bind(this)} />
      </MUI.Dialog>
    );
  }
}
