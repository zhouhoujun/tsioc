(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@ts-ioc/core')) :
	typeof define === 'function' && define.amd ? define(['@ts-ioc/core'], factory) :
	(global['platform-browser'] = global['platform-browser'] || {}, global['platform-browser'].umd = global['platform-browser'].umd || {}, global['platform-browser'].umd.js = factory(global['@ts-ioc/core']));
}(this, (function (core_1) { 'use strict';

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

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = Object.setPrototypeOf ||
    ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = Object.assign || function __assign(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
};

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
}

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

function __exportStar(m, exports) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}

function __values(o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);  }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { if (o[n]) i[n] = function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; }; }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator];
    return m ? m.call(o) : typeof __values === "function" ? __values(o) : o[Symbol.iterator]();
}

function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
}

function __importStar(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result.default = mod;
    return result;
}

function __importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { default: mod };
}


var tslib_1 = Object.freeze({
	__extends: __extends,
	__assign: __assign,
	__rest: __rest,
	__decorate: __decorate,
	__param: __param,
	__metadata: __metadata,
	__awaiter: __awaiter,
	__generator: __generator,
	__exportStar: __exportStar,
	__values: __values,
	__read: __read,
	__spread: __spread,
	__await: __await,
	__asyncGenerator: __asyncGenerator,
	__asyncDelegator: __asyncDelegator,
	__asyncValues: __asyncValues,
	__makeTemplateObject: __makeTemplateObject,
	__importStar: __importStar,
	__importDefault: __importDefault
});

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
    tslib_1.__extends(PlatformBrowser, _super);
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

var D__workspace_github_tsioc_packages_platformBrowser_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(BrowserModuleLoader_1, exports);
tslib_1.__exportStar(ContainerBuilder_1, exports);
tslib_1.__exportStar(PlatformBrowser_1, exports);


});

var index = unwrapExports(D__workspace_github_tsioc_packages_platformBrowser_lib);

return index;

})));
