"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BACKENDS_TOKEN = exports.createRunContext = exports.RunContext = void 0;
const ioc_1 = require("@tsdi/ioc");
var ioc_2 = require("@tsdi/ioc");
Object.defineProperty(exports, "RunContext", { enumerable: true, get: function () { return ioc_2.RunContext; } });
Object.defineProperty(exports, "createRunContext", { enumerable: true, get: function () { return ioc_2.createRunContext; } });
/**
 *  hanlder backend multi token.
 */
exports.BACKENDS_TOKEN = (0, ioc_1.token)('BACKENDS');
// export class RunContext extends DefaultContext {
//     constructor(injector: Injector, contextOrEntries?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
//         super(contextOrEntries, entries);
//         this.set(Injector, injector);
//     }
//     getInjector() {
//         return this.get(Injector)
//     }
//     protected override getToken<T>(token: Token<T>) {
//         return this.map.get(token) ?? this.getFromInjector(token)
//     }
//     protected getFromInjector<T>(token: Token<T>) {
//         const value = this.getInjector().get(token);
//         this.set(token, value);
//         return value;
//     }
// }
// export function createRunContext(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RunContext;
// export function createRunContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RunContext;
// export function createRunContext(injector: Injector, previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
//     const context = new RunContext(injector, previous ?? entries, entries);
//     // context.setInjector(injector);
//     return context;
// }
//# sourceMappingURL=handler.js.map