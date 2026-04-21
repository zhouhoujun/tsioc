"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULTA_RESOLVER = exports.Resolver = void 0;
exports.isParameter = isParameter;
exports.getResolver = getResolver;
const tokens_1 = require("./tokens");
function isParameter(target) {
    return target != null && typeof target === 'object' && (target.provider || target.type || (target.name && target.propertyKey));
}
/**
 * Parameter resolver
 */
class Resolver {
}
exports.Resolver = Resolver;
function getResolver(injector) {
    return injector.get(Resolver, null, tokens_1.InjectFlags.Self) ?? injector.get(exports.DEFAULTA_RESOLVER);
}
exports.DEFAULTA_RESOLVER = (0, tokens_1.token)('DEFAULTA_RESOLVER');
//# sourceMappingURL=resolver.js.map