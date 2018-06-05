(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('@ts-ioc/core')) :
	typeof define === 'function' && define.amd ? define(['tslib', '@ts-ioc/core'], factory) :
	(global['platform-browser'] = global['platform-browser'] || {}, global['platform-browser'].umd = global['platform-browser'].umd || {}, global['platform-browser'].umd.js = factory(global.tslib_1,global['@ts-ioc/core']));
}(this, (function (tslib_1,core_1) { 'use strict';

tslib_1 = tslib_1 && tslib_1.hasOwnProperty('default') ? tslib_1['default'] : tslib_1;
core_1 = core_1 && core_1.hasOwnProperty('default') ? core_1['default'] : core_1;

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var BrowserModuleLoader_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


var BrowserModuleLoader = /** @class */ (function (_super) {
    tslib_1.__extends(BrowserModuleLoader, _super);
    function BrowserModuleLoader() {
        return _super.call(this) || this;
    }
    BrowserModuleLoader.prototype.createLoader = function () {
        if (typeof System !== 'undefined') {
            return function (modulepath) {
                return System.import(modulepath);
            };
        }
        else if (typeof commonjsRequire !== 'undefined') {
            return function (modulepath) {
                return new Promise(function (resolve, reject) {
                    commonjsRequire([modulepath], function (mud) {
                        resolve(mud);
                    }, function (err) {
                        reject(err);
                    });
                });
            };
        }
        else {
            throw new Error('has not module loader');
        }
    };
    BrowserModuleLoader.classAnnations = { "name": "BrowserModuleLoader", "params": { "constructor": [], "createLoader": [] } };
    return BrowserModuleLoader;
}(core_1.DefaultModuleLoader));
exports.BrowserModuleLoader = BrowserModuleLoader;


});

unwrapExports(BrowserModuleLoader_1);
var BrowserModuleLoader_2 = BrowserModuleLoader_1.BrowserModuleLoader;

var ContainerBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * container builder for browser.
 *
 * @export
 * @class ContainerBuilder
 * @extends {DefaultContainerBuilder}
 */
var ContainerBuilder = /** @class */ (function (_super) {
    tslib_1.__extends(ContainerBuilder, _super);
    function ContainerBuilder(loader) {
        return _super.call(this, loader || new BrowserModuleLoader_1.BrowserModuleLoader()) || this;
    }
    ContainerBuilder.classAnnations = { "name": "ContainerBuilder", "params": { "constructor": ["loader"] } };
    return ContainerBuilder;
}(core_1.DefaultContainerBuilder));
exports.ContainerBuilder = ContainerBuilder;


});

unwrapExports(ContainerBuilder_1);
var ContainerBuilder_2 = ContainerBuilder_1.ContainerBuilder;

var PlatformBrowser_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * default app configuration.
 */
var defaultAppConfig = {
    rootdir: '',
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
        return new ContainerBuilder_1.ContainerBuilder();
    };
    BroserApplicationBuilder.prototype.getDefaultConfig = function () {
        return core_1.lang.assign({}, defaultAppConfig);
    };
    BroserApplicationBuilder.classAnnations = { "name": "BroserApplicationBuilder", "params": { "constructor": ["baseURL"], "createContainerBuilder": [], "getDefaultConfig": [] } };
    return BroserApplicationBuilder;
}(core_1.ApplicationBuilder));
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
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} boot main module or appliaction configuration.
     * @returns {Promise<any>}  main module bootstrap class instance.
     * @memberof PlatformBrowser
     */
    PlatformBrowser.prototype.bootstrap = function (boot) {
        return _super.prototype.bootstrap.call(this, boot);
    };
    PlatformBrowser.classAnnations = { "name": "PlatformBrowser", "params": { "constructor": ["baseURL"], "create": ["baseURL"], "bootstrap": ["boot"] } };
    return PlatformBrowser;
}(BroserApplicationBuilder));
exports.PlatformBrowser = PlatformBrowser;


});

unwrapExports(PlatformBrowser_1);
var PlatformBrowser_2 = PlatformBrowser_1.BroserApplicationBuilder;
var PlatformBrowser_3 = PlatformBrowser_1.PlatformBrowser;

var D__workspace_github_tsioc_packages_platformBrowser_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(BrowserModuleLoader_1, exports);
tslib_1.__exportStar(ContainerBuilder_1, exports);
tslib_1.__exportStar(PlatformBrowser_1, exports);


});

var index = unwrapExports(D__workspace_github_tsioc_packages_platformBrowser_lib);

return index;

})));
