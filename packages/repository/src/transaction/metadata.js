"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transactional = void 0;
const ioc_1 = require("@tsdi/ioc");
const resolver_1 = require("./resolver");
exports.Transactional = (0, ioc_1.createDecorator)('Transactional', {
    actionType: ioc_1.ActionType.providers,
    def: {
        method: [
            (ctx) => {
                ctx.classRef.setMethodOptions(ctx.define.propertyKey, { resolvers: [resolver_1.TransactionResolver] });
            }
        ]
    },
    appendProps: (meta) => {
        if (!meta.propagation) {
            meta.propagation = 'REQUIRED';
        }
    }
});
//# sourceMappingURL=metadata.js.map