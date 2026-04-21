"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeResolveInterceptor = void 0;
exports.getResolveHandlerToken = getResolveHandlerToken;
const ioc_1 = require("@tsdi/ioc");
/**
 * get transport argument resolve handler token.
 * @param type
 * @returns
 */
function getResolveHandlerToken(type, propertyKey) {
    return (0, ioc_1.getTokenOf)(type, 'RESOLVE_HANDLER', propertyKey);
}
const typeResolveInterceptor = (input, next, context) => {
    const payload = context.getPayload();
    if (payload) {
        const payloadType = (0, ioc_1.getType)(payload);
        if (!input.multi && (input.provider === payloadType || (!input.provider && input.type === payloadType))) {
            return payload;
        }
        const token = getResolveHandlerToken(payloadType);
        const hanlder = context.getInjector().get(token, null);
        if (hanlder) {
            return (0, ioc_1.invokeTail)(() => hanlder.handle(input, context), (res) => {
                if ((0, ioc_1.isResolved)(res))
                    return res;
                return next(input, context);
            });
        }
    }
    return next(input, context);
};
exports.typeResolveInterceptor = typeResolveInterceptor;
//# sourceMappingURL=resolver.js.map