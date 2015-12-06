import * as React from 'react';
const ReactDOM = require('react-dom');
import * as utils from './utils';
import MainComponent from './components/MainComponent';
import Source from './Source';

require('react-tap-event-plugin')();

// TODO: testing
let backupSources: Source[] = [
  new Source('My Stuff', ['~']),
  new Source('Storage', ['/Volumes/Storage/Documents;/Volumes/Storage/Music'])
];

ReactDOM.render(<MainComponent backupSources={backupSources} selectedBackupSource={backupSources[0]} />, document.getElementById('app'));

if (process.env.NODE_ENV === 'development') {
  utils.addLiveReload();
}
