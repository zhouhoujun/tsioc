"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeModuleLoader = void 0;
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const toAbsolute_1 = require("./toAbsolute");
const globby = require("globby");
/**
 * server nodule loader.
 *
 * @export
 * @class NodeModuleLoader
 * @implements {ModuleLoader}
 */
class NodeModuleLoader extends core_1.DefaultModuleLoader {
    loadFile(files, basePath) {
        if ((0, ioc_1.isString)(files)) {
            files = this.normalize(files);
        }
        else {
            files = files.map(f => this.normalize(f));
        }
        basePath = basePath || (0, toAbsolute_1.runMainPath)();
        return globby(files, { cwd: basePath }).then(mflies => {
            return Promise.all(mflies.map(fp => {
                return Promise.resolve(`${(0, toAbsolute_1.toAbsolutePath)(basePath, (0, ioc_1.isString)(fp) ? fp : fp.path)}`).then(s => require(s));
            }));
        });
    }
    createLoader() {
        return (modulepath) => Promise.resolve(`${modulepath}`).then(s => require(s));
    }
}
exports.NodeModuleLoader = NodeModuleLoader;
//# sourceMappingURL=NodeModuleLoader.js.map