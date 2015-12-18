import {ipcRenderer} from 'electron';
import * as React from 'react';
const ReactDOM = require('react-dom');
import * as utils from './utils';
import MainComponent from './components/MainComponent';

require('react-tap-event-plugin')();

ipcRenderer.on('config-loaded', (event, config) => {
  ReactDOM.render(<MainComponent sources={config.sources} archives={config.archives} />, document.getElementById('app'));
});
ipcRenderer.send('load-config');

if (process.env.NODE_ENV === 'development') {
  utils.addLiveReload();
}
