export function addLiveReload() {
  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.src = 'http://localhost:35729/livereload.js';
  head.appendChild(script);
}
