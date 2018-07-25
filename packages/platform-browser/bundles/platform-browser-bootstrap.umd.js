(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('@ts-ioc/core'), require('@ts-ioc/bootstrap'), require('@ts-ioc/platform-browser')) :
	typeof define === 'function' && define.amd ? define(['tslib', '@ts-ioc/core', '@ts-ioc/bootstrap', '@ts-ioc/platform-browser'], factory) :
	(global['platform-browser-bootstrap'] = global['platform-browser-bootstrap'] || {}, global['platform-browser-bootstrap'].umd = global['platform-browser-bootstrap'].umd || {}, global['platform-browser-bootstrap'].umd.js = factory(global.tslib_1,global['@ts-ioc/core'],global.bootstrap,global.platformBrowser));
}(this, (function (tslib_1,core_1,bootstrap,platformBrowser) { 'use strict';

tslib_1 = tslib_1 && tslib_1.hasOwnProperty('default') ? tslib_1['default'] : tslib_1;
core_1 = core_1 && core_1.hasOwnProperty('default') ? core_1['default'] : core_1;
bootstrap = bootstrap && bootstrap.hasOwnProperty('default') ? bootstrap['default'] : bootstrap;
platformBrowser = platformBrowser && platformBrowser.hasOwnProperty('default') ? platformBrowser['default'] : platformBrowser;

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var PlatformBrowser_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * default app configuration.
 */
var defaultAppConfig = {
    baseURL: '',
    debug: false,
    connections: {},
    setting: {}
};
/**
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
var BroserApplicationBuilder = /** @class */ (function (_super) {
    tslib_1.__extends(BroserApplicationBuilder, _super);
    function BroserApplicationBuilder(baseURL) {
        return _super.call(this, baseURL || !core_1.isUndefined(System) ? System.baseURL : location.href) || this;
    }
    BroserApplicationBuilder.prototype.createContainerBuilder = function () {
        return new platformBrowser.ContainerBuilder();
    };
    BroserApplicationBuilder.prototype.createBuilder = function () {
        return this;
    };
    BroserApplicationBuilder.prototype.getDefaultConfig = function () {
        return core_1.lang.assign({}, defaultAppConfig);
    };
    BroserApplicationBuilder.classAnnations = { "name": "BroserApplicationBuilder", "params": { "constructor": ["baseURL"], "createContainerBuilder": [], "createBuilder": [], "getDefaultConfig": [] } };
    return BroserApplicationBuilder;
}(bootstrap.ApplicationBuilder));
exports.BroserApplicationBuilder = BroserApplicationBuilder;
/**
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
var PlatformBrowser = /** @class */ (function (_super) {
    tslib_1.__extends(PlatformBrowser, _super);
    function PlatformBrowser(baseURL) {
        return _super.call(this, baseURL) || this;
    }
    /**
     * create instance.
     *
     * @static
     * @param {string} [baseURL] application start up base path.
     * @returns {PlatformBrowser} PlatfromBrowser instance.
     * @memberof PlatformBrowser
     */
    PlatformBrowser.create = function (baseURL) {
        return new PlatformBrowser(baseURL);
    };
    /**
     * bootstrap application via main module.
     *
     * @template T
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token main module or appliaction configuration.
     * @returns {Promise<any>}  main module bootstrap class instance.
     * @memberof PlatformBrowser
     */
    PlatformBrowser.prototype.bootstrap = function (token) {
        return _super.prototype.bootstrap.call(this, token);
    };
    PlatformBrowser.classAnnations = { "name": "PlatformBrowser", "params": { "constructor": ["baseURL"], "create": ["baseURL"], "bootstrap": ["token"] } };
    return PlatformBrowser;
}(BroserApplicationBuilder));
exports.PlatformBrowser = PlatformBrowser;


});

unwrapExports(PlatformBrowser_1);
var PlatformBrowser_2 = PlatformBrowser_1.BroserApplicationBuilder;
var PlatformBrowser_3 = PlatformBrowser_1.PlatformBrowser;

var D__Workspace_Projects_modules_tsioc_packages_platformBrowser_bootstrap_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(PlatformBrowser_1, exports);


});

var index = unwrapExports(D__Workspace_Projects_modules_tsioc_packages_platformBrowser_bootstrap_lib);

return index;

})));
