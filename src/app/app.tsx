import {ipcRenderer} from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as utils from './utils';
import Murphy from './components/Murphy';

require('react-tap-event-plugin')();

ipcRenderer.on('config-loaded', (event, config) => {
  ReactDOM.render(<Murphy config={config} />, document.getElementById('app'));
});
ipcRenderer.send('load-config');

if (process.env.NODE_ENV === 'development') {
  utils.addLiveReload();
}
