import {remote, ipcRenderer} from 'electron';
const dialog = remote.require('dialog');
import * as path from 'path';
import * as React from 'react';
import * as MUI from 'material-ui';
import * as ThemeManager from 'material-ui/lib/styles/theme-manager';
import Theme = require('./MurphyTheme');
import {Source, Archive} from '../models';
import AddSelectField from './AddSelectField';
import VerticalSeparator from './VerticalSeparator';

interface Props {
  sources: Source[];
  archives: Archive[];
}

interface State {
}

export default class Backup extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  static childContextTypes: any = {
    muiTheme: React.PropTypes.object
  }

  private get styles() {
    const padding: number = Theme.spacing.desktopGutter;
    return {
      card: {
        position: 'relative',
        margin: padding,
        padding: padding,
      },
      leftSide: {
        display: 'inline-block',
        width: '50%',
        verticalAlign: 'top',
        paddingRight: padding,
        boxSizing: 'border-box',
        textAlign: 'center'
      },
      rightSide: {
        display: 'inline-block',
        width: '50%',
        verticalAlign: 'top',
        paddingLeft: padding,
        boxSizing: 'border-box',
        textAlign: 'center'
      },
      heading: {
        fontSize: 24,
        fontWeight: 400,
        marginTop: 0,
        marginBottom: padding
      },
      headingCaption: {
        display: 'block',
        fontWeight: 400,
        marginTop: 8,
        fontSize: 13
      },
      submitButton: {
        position: 'fixed',
        right: padding,
        bottom: padding
      }
    };
  }

  private onSourceAdd(source: Source) {
    dialog.showOpenDialog({
      title: 'Select Folders',
      // defaultPath: process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'],
      properties: ['openDirectory', 'multiSelections']
    }, (folders) => {
      ipcRenderer.send('add-source', {
        name: folders.map(f => path.basename(f)).join(', '), // TODO: present dialog to name source
        paths: folders
      });
    });
  }

  private onArchiveAdd(source: Source) {
    dialog.showOpenDialog({
      title: 'Select Folder',
      properties: ['openDirectory', 'createDirectory']
    }, (folders) => {
      ipcRenderer.send('add-archive', {
        name: path.basename(folders[0]), // TODO: present dialog to name backup
        path: folders[0]
      });
    });
  }

  render() {
    return (
      <div style={{height: '100%'}}>
        <MUI.Paper style={this.styles.card}>
          <div style={this.styles.leftSide}>
            <h2 style={this.styles.heading}>
              What
              <small style={this.styles.headingCaption}>What folders should I back up?</small>
            </h2>
            <AddSelectField label="Folders" items={this.props.sources.map(s => s.name)} onAdd={this.onSourceAdd.bind(this)} />
          </div>
          <VerticalSeparator verticalMargin={Theme.spacing.desktopGutter} />
          <div style={this.styles.rightSide}>
            <h2 style={this.styles.heading}>
              Where
              <small style={this.styles.headingCaption}>Where should I back them up?</small>
            </h2>
            <AddSelectField label="Backup" items={this.props.archives.map(a => a.name)} onAdd={this.onArchiveAdd.bind(this)} />
          </div>
        </MUI.Paper>
        <MUI.Paper style={this.styles.card}>
          <MUI.LinearProgress mode="determinate" value={60} />
          <div>Status goes here</div>
        </MUI.Paper>
        <MUI.FloatingActionButton style={this.styles.submitButton}>
          <MUI.SvgIcon>
            <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
          </MUI.SvgIcon>
        </MUI.FloatingActionButton>
      </div>
    );
  }
}
