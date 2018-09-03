'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib_1 = _interopDefault(require('tslib'));
var core = _interopDefault(require('@ts-ioc/core'));
var bootstrap_1 = _interopDefault(require('@ts-ioc/bootstrap'));
var fs_1 = _interopDefault(require('fs'));
var path = _interopDefault(require('path'));
var platformServer = _interopDefault(require('@ts-ioc/platform-server'));

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
    async load(uri) {
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
    async registerExts(container, config) {
        await super.registerExts(container, config);
        await Promise.all(this.dirMatchs.map(dirs => {
            return container.loadModule(container, {
                basePath: config.baseURL,
                files: dirs
            });
        }));
        return container;
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

module.exports = index;

//# sourceMappingURL=sourcemaps/platform-server-bootstrap.js.map

//# sourceMappingURL=sourcemaps/platform-server-bootstrap.js.map
