(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@ts-ioc/core')) :
	typeof define === 'function' && define.amd ? define(['@ts-ioc/core'], factory) :
	(global['platform-browser'] = global['platform-browser'] || {}, global['platform-browser'].umd = global['platform-browser'].umd || {}, global['platform-browser'].umd.js = factory(global['@ts-ioc/core']));
}(this, (function (core_1) { 'use strict';

core_1 = core_1 && core_1.hasOwnProperty('default') ? core_1['default'] : core_1;

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

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
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });

var BrowserModuleLoader = /** @class */ (function (_super) {
    __extends(BrowserModuleLoader, _super);
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
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * container builder for browser.
 *
 * @export
 * @class ContainerBuilder
 * @extends {DefaultContainerBuilder}
 */
var ContainerBuilder = /** @class */ (function (_super) {
    __extends(ContainerBuilder, _super);
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
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
    __extends(BroserApplicationBuilder, _super);
    function BroserApplicationBuilder(baseURL) {
        return _super.call(this, baseURL || !core_1.isUndefined(System) ? System.baseURL : location.href) || this;
    }
    BroserApplicationBuilder.prototype.bootstrap = function (boot) {
        return _super.prototype.bootstrap.call(this, boot);
    };
    /**
     * get container builder.
     *
     * @returns
     * @memberof Bootstrap
     */
    BroserApplicationBuilder.prototype.getContainerBuilder = function () {
        if (!this.builder) {
            this.builder = new ContainerBuilder_1.ContainerBuilder();
        }
        return this.builder;
    };
    BroserApplicationBuilder.prototype.getDefaultConfig = function () {
        return core_1.lang.assign({}, defaultAppConfig);
    };
    BroserApplicationBuilder.classAnnations = { "name": "BroserApplicationBuilder", "params": { "constructor": ["baseURL"], "bootstrap": ["boot"], "getContainerBuilder": [], "getDefaultConfig": [] } };
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
    __extends(PlatformBrowser, _super);
    function PlatformBrowser(baseURL) {
        return _super.call(this, baseURL) || this;
    }
    PlatformBrowser.create = function (rootdir) {
        return new PlatformBrowser(rootdir);
    };
    PlatformBrowser.prototype.bootstrap = function (boot) {
        return _super.prototype.bootstrap.call(this, boot);
    };
    PlatformBrowser.classAnnations = { "name": "PlatformBrowser", "params": { "constructor": ["baseURL"], "create": ["rootdir"], "bootstrap": ["boot"] } };
    return PlatformBrowser;
}(BroserApplicationBuilder));
exports.PlatformBrowser = PlatformBrowser;


});

unwrapExports(PlatformBrowser_1);
var PlatformBrowser_2 = PlatformBrowser_1.BroserApplicationBuilder;
var PlatformBrowser_3 = PlatformBrowser_1.PlatformBrowser;

var D__Workspace_Projects_modules_tsioc_packages_platformBrowser_lib = createCommonjsModule(function (module, exports) {
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(BrowserModuleLoader_1);
__export(ContainerBuilder_1);
__export(PlatformBrowser_1);


});

var index = unwrapExports(D__Workspace_Projects_modules_tsioc_packages_platformBrowser_lib);

return index;

})));
