"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Autorun = exports.Singleton = exports.Static = exports.Refs = exports.ProvidedIn = exports.Providers = exports.Injectable = exports.Host = exports.SkipSelf = exports.Self = exports.Optional = exports.Param = exports.Nullable = exports.Inject = exports.Autowired = exports.Module = void 0;
exports.createModuleDecorator = createModuleDecorator;
exports.nonEnumerable = nonEnumerable;
const chk_1 = require("../utils/chk");
const tokens_1 = require("../tokens");
const fac_1 = require("./fac");
const module_ref_1 = require("../module.ref");
const lang_1 = require("../utils/lang");
const define_1 = require("./define");
/**
 * create module decorator.
 *
 * @export
 * @template T
 * @param {string} name decorator name.
 * @param {DecoratorOption<T>} [options]
 * @returns {Module<T>}
 */
function createModuleDecorator(name, options) {
    options = options ?? {};
    const hd = options.def?.class ?? [];
    const append = options.appendProps;
    return (0, fac_1.createDecorator)(name, {
        ...options,
        actionType: define_1.ActionType.module,
        def: {
            ...options.def,
            class: [
                (ctx) => {
                    const def = ctx.classRef.getAnnotation();
                    const metadata = ctx.define.metadata;
                    def.module = true;
                    def.providedIn = metadata.providedIn;
                    def.baseURL = metadata.baseURL;
                    def.debug = metadata.debug;
                    if (metadata.providers) {
                        def.providers.push(...metadata.providers);
                    }
                    if (metadata.imports)
                        def.imports = (0, module_ref_1.getModuleType)(metadata.imports);
                    if (metadata.exports)
                        def.exports = (0, lang_1.getTypes)(metadata.exports);
                    if (metadata.declarations)
                        def.declarations = (0, lang_1.getTypes)(metadata.declarations);
                    if (metadata.bootstrap)
                        def.bootstrap = (0, lang_1.getTypes)(metadata.bootstrap);
                },
                ...(0, chk_1.isArray)(hd) ? hd : [hd]
            ]
        },
        // design: {
        //     beforeAnnoation: (classRef, context) => {
        //         // use as dependence inject module.
        //         if (context.injectorType) {
        //             context.injectorType(context.type, context.classRef);
        //         }
        //     }
        // },
        appendProps: (meta) => {
            if (append) {
                append(meta);
            }
        }
    });
}
/**
 * `Module` Decorator, definde class as module.
 *
 * @Module
 * @exports {@link Module}
 */
exports.Module = createModuleDecorator('Module');
/**
 * `Autowired` decorator, for property or param. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * 类方法的注入修饰器， 用于声明的类方法的扩展调用配置。
 * @Autowired()
 */
exports.Autowired = (0, fac_1.createDecorator)('Autowired', {
    actionType: define_1.ActionType.inject | define_1.ActionType.providers,
    props: (provider, alias) => {
        if (alias) {
            return (0, chk_1.isString)(alias) ? { provider: (0, tokens_1.getToken)(provider, alias) } : { provider: (0, tokens_1.getToken)(provider, alias.alias), ...alias, alias: undefined };
        }
        else {
            return { provider: provider };
        }
    }
});
/**
 * `Inject` decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Inject()
 */
exports.Inject = (0, fac_1.createDecorator)('Inject', {
    actionType: define_1.ActionType.inject,
    props: (provider, alias) => {
        if (alias) {
            return (0, chk_1.isString)(alias) ? { provider: (0, tokens_1.getToken)(provider, alias) } : { provider: (0, tokens_1.getToken)(provider, alias.alias), ...alias, alias: undefined };
        }
        else {
            return { provider };
        }
    }
});
/**
 * @Nullable decoator. define param can enable null.
 */
exports.Nullable = (0, fac_1.createDecorator)('Nullable', {
    actionType: define_1.ActionType.inject,
    appendProps: (meta) => {
        meta.nullable = true;
        return meta;
    }
});
/**
 * param decorator, define for parameter. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Param()
 */
exports.Param = (0, fac_1.createParamDecorator)('Param', {
    actionType: define_1.ActionType.inject
});
exports.Optional = (0, fac_1.createParamDecorator)('Optional', {
    actionType: define_1.ActionType.inject,
    appendProps: (meta) => {
        if (meta.flags) {
            meta.flags = meta.flags | tokens_1.InjectFlags.Optional;
        }
        else {
            meta.flags = tokens_1.InjectFlags.Optional;
        }
        return meta;
    }
});
exports.Self = (0, fac_1.createParamDecorator)('Self', {
    appendProps: (meta) => {
        if (meta.flags) {
            meta.flags = meta.flags | tokens_1.InjectFlags.Self;
        }
        else {
            meta.flags = tokens_1.InjectFlags.Self;
        }
        return meta;
    }
});
/**
 * `SkipSelf` decorator and metadata.
 *
 * @Annotation
 * @publicApi
 */
exports.SkipSelf = (0, fac_1.createParamDecorator)('SkipSelf', {
    actionType: define_1.ActionType.inject,
    appendProps: (meta) => {
        if (meta.flags) {
            meta.flags = meta.flags | tokens_1.InjectFlags.SkipSelf;
        }
        else {
            meta.flags = tokens_1.InjectFlags.SkipSelf;
        }
        return meta;
    }
});
/**
 * Host decorator and metadata.
 * @Annotation
 * @publicApi
 */
exports.Host = (0, fac_1.createParamDecorator)('Host', {
    actionType: define_1.ActionType.inject,
    appendProps: (meta) => {
        if (meta.flags) {
            meta.flags = meta.flags | tokens_1.InjectFlags.Host;
        }
        else {
            meta.flags = tokens_1.InjectFlags.Host;
        }
        return meta;
    }
});
/**
 * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
 *
 * @Injectable()
 */
exports.Injectable = (0, fac_1.createDecorator)('Injectable', {
    actionType: define_1.ActionType.annoation | define_1.ActionType.providers,
    props: (provide, arg2, arg3) => {
        if ((0, chk_1.isString)(arg2)) {
            return { provide: (0, tokens_1.getToken)(provide, arg2), ...arg3 };
        }
        else {
            return { provide, ...arg2 };
        }
    }
});
/**
 * Providers decorator, for class. use to add ref service to the class.
 *
 * @Providers
 */
exports.Providers = (0, fac_1.createDecorator)('Providers', {
    actionType: define_1.ActionType.providers,
    props: (providers) => ({ providers }),
});
/**
 * ProvidedIn decorator, for class. use to define the class as service provider for target type.
 *
 * @ProvidedIn
 */
exports.ProvidedIn = (0, fac_1.createDecorator)('ProvidedIn', {
    props: (target, provide, alias) => ({ target, provide: (0, tokens_1.getToken)(provide, alias) }),
    design: {
        afterAnnoation: (typeRef, context) => {
            const meta = typeRef.getMetadata(context.currDecor);
            const type = typeRef.type;
            const prds = (meta?.provide ? { provide: meta.provide, useClass: type } : type);
            const platform = context.runtime;
            const injector = context.injector;
            platform.setTypeProvider(meta.target, prds);
            injector.onDestroy(() => {
                platform.removeTypeProvider(type, prds);
            });
        }
    }
});
/**
 * @deprecated use `providedIn` instead.
 */
exports.Refs = exports.ProvidedIn;
/**
 * Static decorator, for class. use to define the class is static in injector.
 *
 * @Static()
 */
exports.Static = (0, fac_1.createDecorator)('Static', {
    actionType: define_1.ActionType.annoation,
    props: (provide, alias) => ({ provide: (0, tokens_1.getToken)(provide, alias) }),
    appendProps: (meta) => {
        meta.static = true;
    }
});
/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton()
 */
exports.Singleton = (0, fac_1.createDecorator)('Singleton', {
    actionType: define_1.ActionType.annoation,
    props: (provide, alias) => ({ provide: (0, tokens_1.getToken)(provide, alias) }),
    appendProps: (meta) => {
        meta.singleton = true;
    }
});
/**
 * Autorun decorator, for class or method.  use to define the class auto run (via a method or not) after registered.
 *
 * @Autorun
 */
exports.Autorun = (0, fac_1.createDecorator)('Autorun', {
    actionType: define_1.ActionType.runnable,
    props: (arg, args) => {
        if ((0, chk_1.isString)(arg)) {
            return { propertyKey: arg, args };
        }
        return { order: arg, args };
    },
    afterInit: (ctx) => {
        ctx.define.metadata.auto = true;
        if (ctx.define.decorType === 'class') {
            ctx.define.metadata.singleton = true;
        }
    }
});
function nonEnumerable(target, propertyKey, descriptor) {
    if (descriptor) {
        descriptor.enumerable = false;
        return descriptor;
    }
    else {
        // 对于旧版 TypeScript/ES5，可能需要这种方式
        Object.defineProperty(target, propertyKey, {
            enumerable: false,
            writable: true,
            configurable: true,
            value: target[propertyKey]
        });
    }
}
//# sourceMappingURL=decor.js.map