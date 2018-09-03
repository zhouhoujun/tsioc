'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib_1 = _interopDefault(require('tslib'));
var core_1 = _interopDefault(require('@ts-ioc/core'));

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

class BrowserModuleLoader extends core_1.DefaultModuleLoader {
    constructor() {
        super();
    }
    createLoader() {
        if (typeof System !== 'undefined') {
            return (modulepath) => {
                return System.import(modulepath);
            };
        }
        else if (typeof commonjsRequire !== 'undefined') {
            return (modulepath) => {
                return new Promise((resolve, reject) => {
                    commonjsRequire([modulepath], (mud) => {
                        resolve(mud);
                    }, err => {
                        reject(err);
                    });
                });
            };
        }
        else {
            throw new Error('has not module loader');
        }
    }
}
BrowserModuleLoader.classAnnations = { "name": "BrowserModuleLoader", "params": { "constructor": [], "createLoader": [] } };
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
class ContainerBuilder extends core_1.DefaultContainerBuilder {
    constructor(loader) {
        super(loader || new BrowserModuleLoader_1.BrowserModuleLoader());
    }
}
ContainerBuilder.classAnnations = { "name": "ContainerBuilder", "params": { "constructor": ["loader"] } };
exports.ContainerBuilder = ContainerBuilder;




});

unwrapExports(ContainerBuilder_1);
var ContainerBuilder_2 = ContainerBuilder_1.ContainerBuilder;

var D__workspace_github_tsioc_packages_platformBrowser_esnext = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(BrowserModuleLoader_1, exports);
tslib_1.__exportStar(ContainerBuilder_1, exports);




});

var index = unwrapExports(D__workspace_github_tsioc_packages_platformBrowser_esnext);

module.exports = index;

//# sourceMappingURL=sourcemaps/platform-browser.js.map

//# sourceMappingURL=sourcemaps/platform-browser.js.map
