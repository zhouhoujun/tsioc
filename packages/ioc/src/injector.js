"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INJECT_IMPL = exports.CONTAINER = exports.INJECTOR = exports.EnvironmentInjector = exports.Injector = exports.RECORDS = void 0;
exports.isInjector = isInjector;
exports.createInjector = createInjector;
const tslib_1 = require("tslib");
const tokens_1 = require("./tokens");
const fac_1 = require("./metadata/fac");
const chk_1 = require("./utils/chk");
const exception_1 = require("./exception");
exports.RECORDS = Symbol('RECORDS');
/**
 * injector.
 * implements {@link Destroyable}
 *
 * IoC 容器，注入器
 */
let Injector = class Injector {
};
exports.Injector = Injector;
exports.Injector = Injector = tslib_1.__decorate([
    (0, fac_1.Abstract)()
], Injector);
let EnvironmentInjector = class EnvironmentInjector extends Injector {
};
exports.EnvironmentInjector = EnvironmentInjector;
exports.EnvironmentInjector = EnvironmentInjector = tslib_1.__decorate([
    (0, fac_1.Abstract)()
], EnvironmentInjector);
/**
 * ROOT injector instance token of self.
 */
exports.INJECTOR = (0, tokens_1.token)('DI_INJECTOR');
/**
 * appliction platform injector token.
 */
exports.CONTAINER = (0, tokens_1.token)('CONTAINER', 'platform');
/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is Injector}
 */
function isInjector(target) {
    return exports.INJECT_IMPL.isInjector(target);
}
function createInjector(parentOrPds, pdsOrOpts, scope) {
    if (!parentOrPds || (0, chk_1.isArray)(parentOrPds)) {
        return exports.INJECT_IMPL.createRoot(parentOrPds);
    }
    return (0, chk_1.isArray)(pdsOrOpts) ? exports.INJECT_IMPL.create(parentOrPds, pdsOrOpts, scope) : exports.INJECT_IMPL.createByOptions(parentOrPds, pdsOrOpts, scope);
}
/**
 * injector factory implement.
 */
exports.INJECT_IMPL = {
    createRoot(providers) {
        throw new exception_1.Exception('not implemented.');
    },
    /**
     * create injector
     * @param parent
     * @param providers
     * @param scope
     */
    create(parent, providers, scope) {
        throw new exception_1.Exception('not implemented.');
    },
    /**
     * create injector
     * @param parent
     * @param options
     * @param scope
     */
    createByOptions(parent, options, scope) {
        throw new exception_1.Exception('not implemented.');
    },
    isInjector(target) {
        throw new exception_1.Exception('not implemented.');
    }
};
//# sourceMappingURL=injector.js.map