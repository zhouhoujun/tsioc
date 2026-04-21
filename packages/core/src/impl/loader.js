"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultModuleLoader = void 0;
exports.isPathModules = isPathModules;
const ioc_1 = require("@tsdi/ioc");
const ModuleLoader_1 = require("../ModuleLoader");
/**
 * default module loader for {@link ModuleLoader}.
 *
 * @export
 * @class DefaultModuleLoader
 * @extends {ModuleLoader}
 */
class DefaultModuleLoader extends ModuleLoader_1.ModuleLoader {
    getLoader() {
        if (!this._loader) {
            this._loader = this.createLoader();
        }
        return this._loader;
    }
    async register(injecor, modules) {
        const mdls = await this.load(modules);
        return ioc_1.InjectUtil.use(injecor, mdls);
    }
    /**
     * load module.
     *
     * @param {LoadType[]} modules
     * @returns {Promise<Modules[]>}
     */
    load(modules) {
        if (modules.length) {
            return Promise.all(modules.map(mdty => this.getMoudle(mdty)))
                .then(mds => mds.reduce((prv, m) => prv.concat(m), []));
        }
        else {
            return Promise.resolve([]);
        }
    }
    getMoudle(mdty) {
        if ((0, ioc_1.isString)(mdty)) {
            return this.isFile(mdty) ? this.loadFile(mdty) : this.require(mdty).then(m => m ? [m] : []);
        }
        else if (isPathModules(mdty)) {
            return this.loadPathModule(mdty);
        }
        else {
            return Promise.resolve(mdty ? [mdty] : []);
        }
    }
    /**
     * load all class types in modules
     *
     * @param {LoadType[]} mdl
     * @returns {Promise<Type[]>}
     */
    async loadType(mdl) {
        const mdls = await this.getMoudle(mdl);
        return ioc_1.lang.getTypes(mdls);
    }
    /**
     * load types from module.
     *
     * @param {LoadType[]} modules
     * @returns {Promise<Type[]>}
     */
    async loadTypes(modules) {
        const mdls = await this.load(modules);
        return mdls.map(md => ioc_1.lang.getTypes(md));
    }
    require(moduleName) {
        const loader = this.getLoader();
        return loader(moduleName);
    }
    loadFile(files, basePath) {
        const loader = this.getLoader();
        let fRes;
        basePath = basePath ? this.normalize(basePath) : '';
        if ((0, ioc_1.isArray)(files)) {
            fRes = Promise.all(files.map(f => loader(this.resolveFilename(this.normalize(f), basePath))))
                .then(mds => mds.reduce((prv, m) => prv.concat(m), []).filter(it => !!it));
        }
        else {
            fRes = loader(this.resolveFilename(this.normalize(files), basePath)).then(m => m ? [m] : []);
        }
        return fRes;
    }
    resolveFilename(filename, basePath) {
        if (basePath) {
            if (filename.startsWith(basePath)) {
                return filename;
            }
            return /\/$/.test(basePath) ? basePath + filename : basePath + '/' + filename;
        }
        return filename;
    }
    isFile(str) {
        return str && fileChkExp.test(str.split('\\').join('/'));
    }
    async loadPathModule(pmd) {
        const modules = pmd.files ? await this.loadFile(pmd.files, pmd.basePath) : [];
        if (pmd.modules) {
            await Promise.all(pmd.modules.map(async (nmd) => {
                if ((0, ioc_1.isString)(nmd)) {
                    modules.push(await this.require(nmd));
                }
                else {
                    modules.push(nmd);
                }
            }));
        }
        return modules;
    }
    createLoader() {
        return (pth) => Promise.resolve(`${pth}`).then(s => require(s));
    }
    normalize(pth) {
        return pth ? pth.split('\\').join('/') : pth;
    }
}
exports.DefaultModuleLoader = DefaultModuleLoader;
_a = ioc_1.noPointcut;
DefaultModuleLoader[_a] = true;
const fileChkExp = /\/((\w|%|\.))+\.\w+$/;
function isPathModules(target) {
    return (0, ioc_1.isMetadataObject)(target, 'modules', 'files');
}
//# sourceMappingURL=loader.js.map