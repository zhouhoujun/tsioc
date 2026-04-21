"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = exports.ContextToken = void 0;
exports.hasContextOptions = hasContextOptions;
const chk_1 = require("./utils/chk");
/**
 * context token.
 */
class ContextToken {
    constructor(defaultValue) {
        this.defaultValue = defaultValue;
    }
}
exports.ContextToken = ContextToken;
class Context {
}
exports.Context = Context;
// /**
//  * RunContext - Optimized context for runtime execution.
//  *
//  * Combines Context with Injector for efficient data passing during method invocation.
//  * Avoids creating full InvocationContext instances when only runtime data is needed.
//  *
//  * 运行时上下文 - 优化的运行时执行上下文。
//  * 结合 Context 和 Injector，在方法调用期间高效传递数据。
//  * 当只需要运行时数据时，避免创建完整的 InvocationContext 实例。
//  */
// export abstract class InvocationContext extends Context {
//     abstract getInjector(): Injector;
//     abstract setInjector(injector: Injector): this;
//     abstract getPayload<T = any>(): T;
//     abstract setPayload<T>(payload: T): this;
//     abstract onFailed(failed: (target: AbstractType, propertyKey: string) => void): this;
// }
function hasContextOptions(option) {
    if (!option)
        return false;
    return (0, chk_1.isArray)(option.providers ?? option.resolvers ?? option.values);
}
//# sourceMappingURL=context.js.map