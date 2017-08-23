var Url = require('url');
var nodeFetch = require('node-fetch');


function patchFetchXhr(wwwDir, window) {
  patchFetch(wwwDir, window);
}


function patchFetch(wwwDir, window) {

  function fetch(input, init) {
    createServer(wwwDir, window);

    if (typeof input === 'string') {
      // fetch(url)
      return nodeFetch(normalizeUrl(window, input), init);

    } else {
      // fetch(Request)
      input.url = normalizeUrl(window, input.url);
      return nodeFetch(input, init);
    }
  }

  window.fetch = fetch;
}


function normalizeUrl(window, url) {
  var parsedUrl = Url.parse(url);

  if (!parsedUrl.protocol || !parsedUrl.hostname) {
    parsedUrl.protocol = 'http:';
    parsedUrl.host = 'localhost:53536';
    url = Url.format(parsedUrl);
  }

  return url;
}


function createServer(wwwDir, window) {
  if (window.__server) return;

  console.log('wwwDir', wwwDir)
}

exports.patchFetchXhr = patchFetchXhr;
