(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('@ts-ioc/core'), require('@ts-ioc/bootstrap'), require('@ts-ioc/platform-browser')) :
	typeof define === 'function' && define.amd ? define(['tslib', '@ts-ioc/core', '@ts-ioc/bootstrap', '@ts-ioc/platform-browser'], factory) :
	(global['platform-browser-bootstrap'] = global['platform-browser-bootstrap'] || {}, global['platform-browser-bootstrap'].js = factory(global.tslib,global['@ts-ioc/core'],global.bootstrap,global.platformBrowser));
}(this, (function (tslib,core,bootstrap,platformBrowser) { 'use strict';

tslib = tslib && tslib.hasOwnProperty('default') ? tslib['default'] : tslib;
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
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * application builder for browser side.
 *
 * @export
 * @class ApplicationBuilder
 * @extends {DefaultApplicationBuilder}
 * @implements {IBroserApplicationBuilder<T>}
 */
class ApplicationBuilder extends bootstrap.DefaultApplicationBuilder {
    constructor(baseURL) {
        super(baseURL || !core.isUndefined(System) ? System.baseURL : location.href);
    }
    /**
     * create instance.
     *
     * @static
     * @param {string} [baseURL] application start up base path.
     * @returns {AnyApplicationBuilderBroser} ApplicationBuilder instance.
     * @memberof ApplicationBuilder
     */
    static create(baseURL) {
        return new ApplicationBuilder(baseURL);
    }
    createContainerBuilder() {
        return new platformBrowser.ContainerBuilder();
    }
    createBuilder() {
        return this;
    }
}
ApplicationBuilder.classAnnations = { "name": "ApplicationBuilder", "params": { "constructor": ["baseURL"], "create": ["baseURL"], "createContainerBuilder": [], "createBuilder": [] } };
exports.ApplicationBuilder = ApplicationBuilder;




});

unwrapExports(ApplicationBuilder_1);
var ApplicationBuilder_2 = ApplicationBuilder_1.ApplicationBuilder;

var D__workspace_github_tsioc_packages_platformBrowser_bootstrap_esnext = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib.__exportStar(ApplicationBuilder_1, exports);




});

var index = unwrapExports(D__workspace_github_tsioc_packages_platformBrowser_bootstrap_esnext);

return index;

})));

//# sourceMappingURL=sourcemaps/platform-browser-bootstrap.js.map

//# sourceMappingURL=sourcemaps/platform-browser-bootstrap.js.map
