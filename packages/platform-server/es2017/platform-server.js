'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib_1 = _interopDefault(require('tslib'));
var core_1 = _interopDefault(require('@ts-ioc/core'));
var path = _interopDefault(require('path'));
var globby = _interopDefault(require('globby'));

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var toAbsolute = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * convert path to absolute path.
 *
 * @export
 * @param {string} root
 * @param {string} pathstr
 * @returns {string}
 */
function toAbsolutePath(root, pathstr) {
    if (!root || path.isAbsolute(pathstr)) {
        return pathstr;
    }
    return path.join(root, pathstr);
}
exports.toAbsolutePath = toAbsolutePath;
/**
 * convert src to absolute path src.
 *
 * @export
 * @param {string} root
 * @param {(string|string[])} src
 * @returns {(string|string[])}
 */
function toAbsoluteSrc(root, src) {
    if (core_1.isString(src)) {
        return prefixSrc(root, src);
    }
    else {
        return src.map(p => prefixSrc(root, p));
    }
}
exports.toAbsoluteSrc = toAbsoluteSrc;
function prefixSrc(root, strSrc) {
    let prefix = '';
    if (/^!/.test(strSrc)) {
        prefix = '!';
        strSrc = strSrc.substring(1, strSrc.length);
    }
    return prefix + toAbsolutePath(root, strSrc);
}




});

unwrapExports(toAbsolute);
var toAbsolute_1 = toAbsolute.toAbsolutePath;
var toAbsolute_2 = toAbsolute.toAbsoluteSrc;

var NodeModuleLoader_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * server nodule loader.
 *
 * @export
 * @class NodeModuleLoader
 * @implements {IModuleLoader}
 */
class NodeModuleLoader extends core_1.DefaultModuleLoader {
    constructor() {
        super();
    }
    loadFile(files, basePath) {
        let globby$$1 = globby;
        return globby$$1(toAbsolute.toAbsoluteSrc(basePath, files)).then((mflies) => {
            return mflies.map(fp => {
                return commonjsRequire(fp);
            });
        });
    }
    createLoader() {
        return (modulepath) => Promise.resolve(commonjsRequire(modulepath));
    }
}
NodeModuleLoader.classAnnations = { "name": "NodeModuleLoader", "params": { "constructor": [], "loadFile": ["files", "basePath"], "createLoader": [] } };
exports.NodeModuleLoader = NodeModuleLoader;




});

unwrapExports(NodeModuleLoader_1);
var NodeModuleLoader_2 = NodeModuleLoader_1.NodeModuleLoader;

var ContainerBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * container builder.
 *
 * @export
 * @class ContainerBuilder
 * @extends {DefaultContainerBuilder}
 */
class ContainerBuilder extends core_1.DefaultContainerBuilder {
    constructor(loader) {
        super(loader || new NodeModuleLoader_1.NodeModuleLoader());
    }
}
ContainerBuilder.classAnnations = { "name": "ContainerBuilder", "params": { "constructor": ["loader"] } };
exports.ContainerBuilder = ContainerBuilder;




});

unwrapExports(ContainerBuilder_1);
var ContainerBuilder_2 = ContainerBuilder_1.ContainerBuilder;

var D__workspace_github_tsioc_packages_platformServer_esnext = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(NodeModuleLoader_1, exports);
tslib_1.__exportStar(ContainerBuilder_1, exports);
tslib_1.__exportStar(toAbsolute, exports);




});

var index = unwrapExports(D__workspace_github_tsioc_packages_platformServer_esnext);

module.exports = index;

//# sourceMappingURL=sourcemaps/platform-server.js.map

//# sourceMappingURL=sourcemaps/platform-server.js.map
