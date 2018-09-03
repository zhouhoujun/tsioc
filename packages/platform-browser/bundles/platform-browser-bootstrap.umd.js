(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('@ts-ioc/core'), require('@ts-ioc/bootstrap'), require('@ts-ioc/platform-browser')) :
	typeof define === 'function' && define.amd ? define(['tslib', '@ts-ioc/core', '@ts-ioc/bootstrap', '@ts-ioc/platform-browser'], factory) :
	(global['platform-browser-bootstrap'] = global['platform-browser-bootstrap'] || {}, global['platform-browser-bootstrap'].umd = global['platform-browser-bootstrap'].umd || {}, global['platform-browser-bootstrap'].umd.js = factory(global.tslib_1,global['@ts-ioc/core'],global.bootstrap,global.platformBrowser));
}(this, (function (tslib_1,core,bootstrap,platformBrowser) { 'use strict';

tslib_1 = tslib_1 && tslib_1.hasOwnProperty('default') ? tslib_1['default'] : tslib_1;
core = core && core.hasOwnProperty('default') ? core['default'] : core;
bootstrap = bootstrap && bootstrap.hasOwnProperty('default') ? bootstrap['default'] : bootstrap;
platformBrowser = platformBrowser && platformBrowser.hasOwnProperty('default') ? platformBrowser['default'] : platformBrowser;

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var ApplicationBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});var ApplicationBuilder=function(r){function t(e){return r.call(this,e||!core.isUndefined(System)?System.baseURL:location.href)||this}return tslib_1.__extends(t,r), t.create=function(e){return new t(e)}, t.prototype.createContainerBuilder=function(){return new platformBrowser.ContainerBuilder}, t.prototype.createBuilder=function(){return this}, t.classAnnations={name:"ApplicationBuilder",params:{constructor:["baseURL"],create:["baseURL"],createContainerBuilder:[],createBuilder:[]}}, t}(bootstrap.DefaultApplicationBuilder);exports.ApplicationBuilder=ApplicationBuilder;



});

unwrapExports(ApplicationBuilder_1);
var ApplicationBuilder_2 = ApplicationBuilder_1.ApplicationBuilder;

var D__workspace_github_tsioc_packages_platformBrowser_bootstrap_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports,"__esModule",{value:!0});tslib_1.__exportStar(ApplicationBuilder_1,exports);



});

var index = unwrapExports(D__workspace_github_tsioc_packages_platformBrowser_bootstrap_lib);

return index;

})));
