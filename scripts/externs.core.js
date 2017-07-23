
/**
 * Externs are used so these properties are not mistakenly
 * renamed. When two JS files are compiled at different times,
 * there are cerain properties that need to NOT be renamed so
 * each JS file can communicate against the known property names.
 *
 * https://developers.google.com/closure/compiler/docs/api-tutorial3
 */


/**
 * Global window.PROJECT
 * Properties which get added to the project's global
 */
function components(){};
function defineComponents(){};
function eventNameFn(){};
function mode(){};


/**
 * Proxy Element
 * Properties set on the proxy element
 */
function $el(){};
function $emit(){};
function $enableListener(){};
function $instance(){};
function listeners(){};
function $(){};


/**
 * Component Instance
 * Methods set on the user's component
 */
function componentWillLoad(){};
function componentDidLoad(){};
function componentWillUpdate(){};
function componentDidUpdate(){};
function componentDidUnload(){};
function hostData(){};
function render(){};


/**
 * Renderer data properties
 * Properties used by the renderer and user's hyperscript
 */
function attrs(){};
function on(){};
function props(){};


/**
 * Compiled hyperscript props
 * Already short, just don't rename them
 */
function a(){};
function c(){};
function e(){};
function h(){};
function k(){};
function l(){};
function m(){};
function n(){};
function o(){};
function p(){};
function s(){};
function t(){};


/**
 * Web Standards
 * Window and document stuff closure doesn't know not to rename
 */
function attachShadow(){};
function attributeChangedCallback(){};
function composed(){};
function connectedCallback(){};
function customElements(){};
function define(){};
function didTimeout(){};
function disconnectedCallback(){};
function host(){};
function observedAttributes(){};
function passive(){};
function requestIdleCallback(){};
function shadowRoot(){};
function timeRemaining(){};
