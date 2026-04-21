"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyTag = void 0;
exports.getDef = getDef;
exports.proxyTag = Symbol('__proxy');
const TYEP_DEF_CACHE = new WeakMap();
function getDef(type) {
    let tagAnn = TYEP_DEF_CACHE.get(type);
    if (!tagAnn) {
        tagAnn = type.ƿAnn?.();
        if (!tagAnn || tagAnn.type !== type) {
            tagAnn = {
                name: type.name,
                type
            };
            TYEP_DEF_CACHE.set(type, tagAnn);
        }
    }
    return tagAnn;
}
//# sourceMappingURL=type.def.js.map