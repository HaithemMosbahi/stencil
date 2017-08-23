import { BuildConfig, BuildContext, HydrateResults, PrerenderStatus } from '../../util/interfaces';
import { buildError, catchError, hasError, readFile } from '../util';
import { prerenderUrl } from './prerender-url';


export function prerenderApp(config: BuildConfig, ctx: BuildContext) {
  if (hasError(ctx.diagnostics)) {
    // no need to rebuild index.html if there were no app file changes
    return Promise.resolve();
  }

  if (!config.prerender || !config.prerender.include || !config.prerender.include.length) {
    const d = buildError(ctx.diagnostics);
    d.messageText = `Missing prerender config`;
    return Promise.resolve();
  }

  const prerenderHost = `http://${config.prerender.host}`;

  getUrlsToPrerender(config, prerenderHost, ctx);

  if (!ctx.prerenderUrlQueue.length) {
    const d = buildError(ctx.diagnostics);
    d.messageText = `No urls found in the prerender config`;
    return Promise.resolve();
  }

  // get the source index html content
  return readFile(config.sys, config.srcIndexHtml).then(indexSrcHtml => {
    // let's do this
    return new Promise(resolve => {
      drainPrerenderQueue(config, ctx, indexSrcHtml, resolve);
    });

  }).catch(() => {
    const d = buildError(ctx.diagnostics);
    d.messageText = `missing index html: ${config.srcIndexHtml}`;
  });
}


function drainPrerenderQueue(config: BuildConfig, ctx: BuildContext, indexSrcHtml: string, resolve: Function) {

  for (var i = 0; i < config.prerender.maxConcurrent; i++) {
    var activelyProcessingCount = ctx.prerenderUrlQueue.filter(p => p.status === PrerenderStatus.processing).length;

    if (activelyProcessingCount >= config.prerender.maxConcurrent) {
      // whooaa, slow down there buddy, let's not get carried away
      return;
    }

    runNextPrerenderUrl(config, ctx, indexSrcHtml, resolve);
  }

  var remaining = ctx.prerenderUrlQueue.filter(p => {
    return p.status === PrerenderStatus.processing || p.status === PrerenderStatus.pending;
  }).length;

  if (remaining === 0) {
    // we're not actively processing anything
    // and there aren't anymore urls in the queue to be prerendered
    // so looks like our job here is done, good work team
    resolve();
  }
}


function runNextPrerenderUrl(config: BuildConfig, ctx: BuildContext, indexSrcHtml: string, resolve: Function) {
  const p = ctx.prerenderUrlQueue.find(p => p.status === PrerenderStatus.pending);
  if (!p) return;

  // we've got a url that's pending
  // well guess what, it's go time
  p.status = PrerenderStatus.processing;

  prerenderUrl(config, ctx, indexSrcHtml, p).then(results => {
    // awesome!!

    // merge any diagnostics we just got from this
    ctx.diagnostics = ctx.diagnostics.concat(results.diagnostics);

    crawlAnchorsForNextUrls(config, ctx, results);

    writePrerenderDest(config, results);

  }).catch(err => {
    // darn, idk, bad news
    catchError(ctx.diagnostics, err);

  }).then(() => {
    p.status = PrerenderStatus.complete;

    // let's try to drain the queue again and let this
    // next call figure out if we're actually done or not
    drainPrerenderQueue(config, ctx, indexSrcHtml, resolve);
  });
}


function writePrerenderDest(config: BuildConfig, results: HydrateResults) {
  const parsedUrl = config.sys.url.parse(results.url);

  const dir = config.sys.path.join(
    config.prerender.prerenderDir,
    parsedUrl.pathname
  );

  const filePath = config.sys.path.join(
    dir,
    `index.html`
  );

  return config.sys.ensureDir(dir).then(() => {
    return new Promise((resolve, reject) => {
      config.sys.fs.writeFile(filePath, results.html, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}


function crawlAnchorsForNextUrls(config: BuildConfig, ctx: BuildContext, results: HydrateResults) {
  results.anchors && results.anchors.forEach(anchor => {
    addUrlToProcess(config, results.url, ctx, anchor.href);
  });
}


function normalizePrerenderUrl(config: BuildConfig, windowLocationHref: string, url: string) {
  try {
    if (typeof url !== 'string') return null;

    const parsedUrl = config.sys.url.parse(url);

    // don't bother for basically empty <a> tags
    // or urls that are not on the same domain
    if (!parsedUrl.pathname || parsedUrl.protocol || parsedUrl.auth || parsedUrl.hostname || parsedUrl.port) return null;

    // clear out any querystrings and hashes
    parsedUrl.search = null;
    parsedUrl.hash = null;

    // convert it back to a nice in pretty url
    url = config.sys.url.format(parsedUrl);

    // resolve it against the base window location url
    url = config.sys.url.resolve(windowLocationHref, url);

  } catch (e) {
    config.logger.error(`url: ${e}`);
    return null;
  }

  return url;
}


function addUrlToProcess(config: BuildConfig, windowLocationHref: string, ctx: BuildContext, url: string) {
  url = normalizePrerenderUrl(config, windowLocationHref, url);

  if (!url || ctx.prerenderUrlQueue.some(p => p.url === url)) return;

  ctx.prerenderUrlQueue.push({
    url: url,
    status: PrerenderStatus.pending
  });
}


function getUrlsToPrerender(config: BuildConfig, windowLocationHref: string, ctx: BuildContext) {
  ctx.prerenderUrlQueue = [];

  if (!config.prerender.include) return;

  config.prerender.include.forEach(prerenderUrl => {
    addUrlToProcess(config, windowLocationHref, ctx, prerenderUrl.url);
  });
}
