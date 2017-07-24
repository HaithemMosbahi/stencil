import { assignHostContentSlots, createVNodesFromSsr } from '../core/renderer/slot';
import { ComponentMeta, ComponentInstance, ComponentRegistry, CoreGlobal,
  DomApi, HostElement, AppGlobal, ListenOptions, LoadComponentRegistry,
  ModuleCallbacks, QueueApi, PlatformApi } from '../util/interfaces';
import { createRenderer } from '../core/renderer/patch';
import { h, t } from '../core/renderer/h';
import { initComponentPrototype, initHostConstructor } from '../core/instance/init';
import { parseComponentMeta, parseComponentRegistry } from '../util/data-parse';
import { SSR_VNODE_ID } from '../util/constants';


export function createPlatformClient(coreGlobal: CoreGlobal, appGlobal: AppGlobal, win: Window, domApi: DomApi, queue: QueueApi, publicPath: string): PlatformApi {
  const registry: ComponentRegistry = { 'HTML': {} };
  const moduleImports: {[tag: string]: any} = {};
  const moduleCallbacks: ModuleCallbacks = {};
  const loadedModules: {[moduleId: string]: boolean} = {};
  const loadedStyles: {[styleId: string]: boolean} = {};
  const pendingModuleRequests: {[url: string]: boolean} = {};


  // create the platform api which will be passed around for external use
  const plt: PlatformApi = {
    registerComponents,
    defineComponent,
    getComponentMeta,
    loadBundle,
    queue,
    connectHostElement,
    emitEvent,
    getEventOptions
  };

  // create the renderer that will be used
  plt.render = createRenderer(plt, domApi);

  // setup the root element which is the mighty <html> tag
  // the <html> has the final say of when the app has loaded
  const rootElm = <HostElement>domApi.$documentElement;
  rootElm._activelyLoadingChildren = [];
  rootElm._initLoad = function appLoadedCallback() {
    // this will fire when all components have finished loaded
    rootElm._hasLoaded = true;
  };


  // if the HTML was generated from SSR
  // then let's walk the tree and generate vnodes out of the data
  createVNodesFromSsr(domApi, rootElm);


  function getComponentMeta(elm: Element) {
    // get component meta using the element
    // important that the registry has upper case tag names
    return registry[elm.tagName];
  }

  function connectHostElement(elm: HostElement, slotMeta: number) {
    // set the "mode" property
    if (!elm.mode) {
      // looks like mode wasn't set as a property directly yet
      // first check if there's an attribute
      // next check the app's global
      elm.mode = domApi.$getAttribute(elm, 'mode') || coreGlobal.mode;
    }

    // host element has been connected to the DOM
    if (!domApi.$getAttribute(elm, SSR_VNODE_ID)) {
      // this host element was NOT created with SSR
      // let's pick out the inner content for slot projection
      assignHostContentSlots(domApi, elm, slotMeta);
    }
  }


  function registerComponents(components: LoadComponentRegistry[]) {
    // this is the part that just registers the minimal amount of data
    // it's basically a map of the component tag name to its associated external bundles
    return (components || []).map(data => parseComponentRegistry(data, registry));
  }


  function defineComponent(cmpMeta: ComponentMeta, HostElementConstructor: any) {
    // initialize the properties on the component module prototype
    initHostConstructor(plt, HostElementConstructor.prototype);

    // add which attributes should be observed
    HostElementConstructor.observedAttributes = cmpMeta.propsMeta.filter(p => p.attribName).map(p => p.attribName);

    // define the custom element
    win.customElements.define(cmpMeta.tagNameMeta.toLowerCase(), HostElementConstructor);
  }


  appGlobal.defineComponents = function defineComponents(moduleId, importFn) {
    const args = arguments;

    // import component function
    // inject globals
    importFn(moduleImports, h, t, coreGlobal, publicPath);

    for (var i = 2; i < args.length; i++) {
      // parse the external component data into internal component meta data
      // then add our set of prototype methods to the component module
      initComponentPrototype(plt, parseComponentMeta(registry, moduleImports, args[i]));
    }

    // fire off all the callbacks waiting on this module to load
    var callbacks = moduleCallbacks[moduleId];
    if (callbacks) {
      for (i = 0; i < callbacks.length; i++) {
        callbacks[i]();
      }
      delete moduleCallbacks[moduleId];
    }

    // remember that we've already loaded this module
    loadedModules[moduleId] = true;
  };


  function loadBundle(cmpMeta: ComponentMeta, elm: HostElement, cb: Function): void {
    const moduleId = cmpMeta.moduleId;

    if (loadedModules[moduleId]) {
      // sweet, we've already loaded this module
      cb();

    } else {
      // never seen this module before, let's start the request
      // and add it to the callbacks to fire when it has loaded
      if (moduleCallbacks[moduleId]) {
        moduleCallbacks[moduleId].push(cb);
      } else {
        moduleCallbacks[moduleId] = [cb];
      }

      // create the url we'll be requesting
      const url = publicPath + moduleId + '.js';

      if (!pendingModuleRequests[url]) {
        // not already actively requesting this url
        // remember that we're now actively requesting this url
        pendingModuleRequests[url] = true;

        // let's kick off the module request
        jsonp(url);
      }

      // we also need to load the css file in the head
      // we've already figured out and set "mode" as a property to the element
      const styleId = cmpMeta.styleIds[elm.mode] || cmpMeta.styleIds.$;
      if (styleId && !loadedStyles[styleId]) {
        // this style hasn't been added to the head yet
        loadedStyles[styleId] = true;

        // append this link element to the head, which starts the request for the file
        const linkElm = domApi.$createElement('link');
        linkElm.href = publicPath + styleId + '.css';
        linkElm.rel = 'stylesheet';
        domApi.$insertBefore(domApi.$head, linkElm, domApi.$head.firstChild);
      }
    }
  }


  function jsonp(url: string) {
    // create a sript element to add to the document.head
    var scriptElm = domApi.$createElement('script');
    scriptElm.charset = 'utf-8';
    scriptElm.async = true;
    scriptElm.src = url;

    // create a fallback timeout if something goes wrong
    var tmrId = setTimeout(onScriptComplete, 120000);

    function onScriptComplete() {
      clearTimeout(tmrId);
      scriptElm.onerror = scriptElm.onload = null;
      domApi.$removeChild(scriptElm.parentNode, scriptElm);

      // remove from our list of active requests
      delete pendingModuleRequests[url];
    }

    // add script completed listener to this script element
    scriptElm.onerror = scriptElm.onload = onScriptComplete;

    // inject a script tag in the head
    // kick off the actual request
    domApi.$appendChild(domApi.$head, scriptElm);
  }

  let WindowCustomEvent = (win as any).CustomEvent;
  if (typeof WindowCustomEvent !== 'function') {
    // CustomEvent polyfill
    WindowCustomEvent = function CustomEvent(event: any, data: any) {
      var evt = domApi.$createEvent();
      evt.initCustomEvent(event, true, true, data.detail);
      return evt;
    };
    WindowCustomEvent.prototype = (win as any).Event.prototype;
  }

  function emitEvent(instance: ComponentInstance, eventName: string, data: any) {
    data = data || {};
    data.bubbles = data.composed = true;
    if (coreGlobal.eventNameFn) {
      eventName = coreGlobal.eventNameFn(eventName);
    }
    instance.$el.dispatchEvent(new WindowCustomEvent(eventName, data));
  }

  // test if this browser supports event options or not
  let supportsEventOptions = false;
  try {
    win.addEventListener('eopt', null,
      Object.defineProperty({}, 'passive', {
        get: () => {
          supportsEventOptions = true;
        }
      })
    );
  } catch (e) {}

  function getEventOptions(opts?: ListenOptions) {
    return supportsEventOptions ? {
        capture: !!(opts && opts.capture),
        passive: !(opts && opts.passive === false)
      } : !!(opts && opts.capture);
  }

  return plt;
}
