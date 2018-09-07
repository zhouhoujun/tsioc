(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('@ts-ioc/core'), require('@ts-ioc/bootstrap'), require('fs'), require('path'), require('@ts-ioc/platform-server')) :
	typeof define === 'function' && define.amd ? define(['tslib', '@ts-ioc/core', '@ts-ioc/bootstrap', 'fs', 'path', '@ts-ioc/platform-server'], factory) :
	(global['platform-server-bootstrap'] = global['platform-server-bootstrap'] || {}, global['platform-server-bootstrap'].js = factory(global.tslib_1,global['@ts-ioc/core'],global.bootstrap_1,global.fs_1,global.path,global.platformServer));
}(this, (function (tslib_1,core,bootstrap_1,fs_1,path,platformServer) { 'use strict';

tslib_1 = tslib_1 && tslib_1.hasOwnProperty('default') ? tslib_1['default'] : tslib_1;
core = core && core.hasOwnProperty('default') ? core['default'] : core;
bootstrap_1 = bootstrap_1 && bootstrap_1.hasOwnProperty('default') ? bootstrap_1['default'] : bootstrap_1;
fs_1 = fs_1 && fs_1.hasOwnProperty('default') ? fs_1['default'] : fs_1;
path = path && path.hasOwnProperty('default') ? path['default'] : path;
platformServer = platformServer && platformServer.hasOwnProperty('default') ? platformServer['default'] : platformServer;

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var ApplicationBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });






let ConfigureFileLoader = class ConfigureFileLoader {
    constructor(baseURL, container) {
        this.baseURL = baseURL;
        this.container = container;
    }
    load(uri) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (uri) {
                if (fs_1.existsSync(uri)) {
                    return commonjsRequire(uri);
                }
                else if (fs_1.existsSync(path.join(this.baseURL, uri))) {
                    return commonjsRequire(path.join(this.baseURL, uri));
                }
                else {
                    console.log(`config file: ${uri} not exists.`);
                    return null;
                }
            }
            else {
                let cfgmodeles;
                let cfgpath = path.join(this.baseURL, './config');
                ['.js', '.ts', '.json'].forEach(ext => {
                    if (cfgmodeles) {
                        return false;
                    }
                    if (fs_1.existsSync(cfgpath + ext)) {
                        cfgmodeles = commonjsRequire(cfgpath + ext);
                        return false;
                    }
                    return true;
                });
                return cfgmodeles;
            }
        });
    }
};
ConfigureFileLoader.classAnnations = { "name": "ConfigureFileLoader", "params": { "constructor": ["baseURL", "container"], "load": ["uri"] } };
ConfigureFileLoader = tslib_1.__decorate([
    core.Injectable(bootstrap_1.AppConfigureLoaderToken),
    tslib_1.__metadata("design:paramtypes", [String, Object])
], ConfigureFileLoader);
exports.ConfigureFileLoader = ConfigureFileLoader;
/**
 * application builder for server side.
 *
 * @export
 * @class Bootstrap
 */
class ApplicationBuilder extends bootstrap_1.DefaultApplicationBuilder {
    constructor(baseURL) {
        super(baseURL);
        this.baseURL = baseURL;
        this.dirMatchs = [];
    }
    /**
     * create instance.
     *
     * @static
     * @template T
     * @param {string} rootdir
     * @returns {ApplicationBuilder}
     * @memberof ApplicationBuilder
     */
    static create(rootdir) {
        return new ApplicationBuilder(rootdir);
    }
    /**
     * load module from dirs.
     *
     * @param {...string[]} matchPaths
     * @returns {this}
     * @memberof PlatformServer
     */
    loadDir(...matchPaths) {
        this.dirMatchs.push(matchPaths);
        return this;
    }
    registerExts(container, config) {
        const _super = name => super[name];
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield _super("registerExts").call(this, container, config);
            yield Promise.all(this.dirMatchs.map(dirs => {
                return container.loadModule(container, {
                    basePath: config.baseURL,
                    files: dirs
                });
            }));
            return container;
        });
    }
    createContainerBuilder() {
        return new platformServer.ContainerBuilder();
    }
    createBuilder() {
        return this;
    }
}
ApplicationBuilder.classAnnations = { "name": "ApplicationBuilder", "params": { "constructor": ["baseURL"], "create": ["rootdir"], "loadDir": ["matchPaths"], "registerExts": ["container", "config"], "createContainerBuilder": [], "createBuilder": [] } };
exports.ApplicationBuilder = ApplicationBuilder;




});

unwrapExports(ApplicationBuilder_1);
var ApplicationBuilder_2 = ApplicationBuilder_1.ConfigureFileLoader;
var ApplicationBuilder_3 = ApplicationBuilder_1.ApplicationBuilder;

var D__workspace_github_tsioc_packages_platformServer_bootstrap_esnext = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(ApplicationBuilder_1, exports);




});

var index = unwrapExports(D__workspace_github_tsioc_packages_platformServer_bootstrap_esnext);

return index;

})));

//# sourceMappingURL=sourcemaps/platform-server-bootstrap.js.map

//# sourceMappingURL=sourcemaps/platform-server-bootstrap.js.map
