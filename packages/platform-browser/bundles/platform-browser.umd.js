(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@ts-ioc/core')) :
	typeof define === 'function' && define.amd ? define(['@ts-ioc/core'], factory) :
	(global['platform-browser'] = global['platform-browser'] || {}, global['platform-browser'].umd = global['platform-browser'].umd || {}, global['platform-browser'].umd.js = factory(global['@ts-ioc/core']));
}(this, (function (core) { 'use strict';

core = core && core.hasOwnProperty('default') ? core['default'] : core;

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
"use strict";
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
}(core.DefaultModuleLoader));
exports.BrowserModuleLoader = BrowserModuleLoader;


});

unwrapExports(BrowserModuleLoader_1);

var ContainerBuilder_1 = createCommonjsModule(function (module, exports) {
"use strict";
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
}(core.DefaultContainerBuilder));
exports.ContainerBuilder = ContainerBuilder;


});

unwrapExports(ContainerBuilder_1);

var D__Workspace_Projects_modules_tsioc_packages_platformBrowser_lib = createCommonjsModule(function (module, exports) {
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(BrowserModuleLoader_1);
__export(ContainerBuilder_1);


});

var index = unwrapExports(D__Workspace_Projects_modules_tsioc_packages_platformBrowser_lib);

return index;

})));
