"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Computed = void 0;
const ioc_1 = require("@tsdi/ioc");
/**
 * Computed decorator, define for property.
 * use to define class property as computed property.
 * @Computed
 */
exports.Computed = (0, ioc_1.createDecorator)('Computed', {
    props: (dependencies, cache = true) => {
        if (Array.isArray(dependencies)) {
            return {
                dependencies,
                cache
            };
        }
        else if (dependencies && typeof dependencies === 'object') {
            return dependencies;
        }
        return { cache };
    }
});
//# sourceMappingURL=computed.js.map