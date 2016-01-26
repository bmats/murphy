import {remote} from 'electron';
const dialog = remote.dialog;
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Engine } from './models';
import * as utils from './utils';
import Murphy from './components/Murphy';

require('react-tap-event-plugin')();

if (process.env.NODE_ENV === 'development') {
  utils.addLiveReload();
}

const engine = new Engine();
engine.on('change', () => ReactDOM.render(<Murphy engine={engine} />, document.getElementById('app')));

engine.backupJob.on('error', error => dialog.showErrorBox('Backup error', error.message));
engine.restoreJob.on('error', error => dialog.showErrorBox('Restore error', error.message));

engine.connect();
