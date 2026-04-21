"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const ioc_1 = require("@tsdi/ioc");
/**
 * @Config decorator.
 */
exports.Config = (0, ioc_1.createParamDecorator)('Config', {
    actionType: ioc_1.ActionType.inject,
    props: (key) => {
        if (typeof key === 'string') {
            return { key };
        }
        return key;
    }
});
//# sourceMappingURL=decorator.js.map