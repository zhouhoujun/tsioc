import { AbstractType, Type } from '../types';
import { InjectFlags, Token } from '../tokens';
import { isPlainObject } from '../utils/obj';
import { cleanObj, deepForEach } from '../utils/lang';
import { isArray, isDefined, isFunction, isNumber, isNil, isPromise, isAbstractType } from '../utils/chk';
import { FnType, FactoryRecord, Injector, RegOption, TypeOption } from '../injector';
import { Exception } from '../exception';
import { Runtime } from '../runtime';
import { getClassRef } from '../metadata/refl';
import { ModuleDef, ClassRef } from '../metadata/class';
import { ModuleWithProviders, Provider, DynamicProvider, StaticProvider, StaticProviders, ModuleType } from '../providers';
import { InvocationContext } from '../context';
import { DesignContext } from '../lifescope/ctx';
import { getRecords, Operator } from './operator';



export const Empty: any[] = [];

export function eachProvider(providers: Provider[], cb: (provider: StaticProvider | DynamicProvider) => void) {
    return deepForEach(providers, cb, v => isPlainObject(v) && !((v as StaticProviders).provide || (v as DynamicProvider).provider));
}



export function mergePromise(ps1: Promise<any> | undefined | void, ps2: () => any) {
    if (ps1) {
        return ps1.then(ps2);
    }
    return ps2();
}

export function processUse(injector: Injector, args: ModuleType[], types?: AbstractType[]) {
    const stk: AbstractType[] = [];
    return deepForEach(args, (ty: any) => {
        if (isAbstractType(ty)) {
            types?.push(ty);
            return processInjectType(injector, ty, stk)
        } else if (isFunction(ty.module) && isArray(ty.providers)) {
            types?.push(ty.module);
            return processInjectType(injector, ty, stk)
        }
    }, v => isPlainObject(v) && !(isFunction(v.module) && isArray(v.providers)));
}

export function processInject(injector: Injector, providers: Provider[], injecting: (injector: Injector, provider: StaticProvider | DynamicProvider) => void = processProvider) {
    if (providers.length) {
        return eachProvider(providers, p => injecting(injector, p))
    }
}

type RegisterExtedOption = (typeRef: ClassRef, option?: RegOption) => RegOption | undefined;
type InjectProvider = (injector: Injector, provider: StaticProvider | DynamicProvider) => void;
type CanRegister = (typeRef: ClassRef, option?: RegOption) => boolean;
type RegisterType = ((injector: Injector, typeRef: ClassRef, option?: RegOption, exted?: RegisterExtedOption, canRegister?: CanRegister) => void)

export function processInjectModule(
    injector: Injector,
    typeOrDef: AbstractType | ModuleWithProviders,
    dedupStack: AbstractType[],
    moduleRefl: ClassRef,
    imported?: boolean,
    injectProvider: InjectProvider = processProvider,
    register: RegisterType = registerClass,
    extedOption?: RegisterExtedOption,
    canRegister?: CanRegister,
): void | Promise<void> {
    return processInjectType(injector, typeOrDef, dedupStack, imported, injectProvider, register, extedOption, canRegister, moduleRefl);
}

export function processInjectType(
    injector: Injector,
    typeOrDef: AbstractType | ModuleWithProviders,
    dedupStack: AbstractType[],
    imported?: boolean,
    injectProvider: InjectProvider = processProvider,
    register: RegisterType = registerClass,
    extedOption?: RegisterExtedOption,
    canRegister?: CanRegister,
    moduleRefl?: ClassRef,
): void | Promise<void> {
    // 提前检查重复处理
    const isFn = isFunction(typeOrDef);
    const type = isFn ? typeOrDef : typeOrDef.module;
    if (dedupStack.includes(type)) {
        return;
    }
    dedupStack.push(type);

    let ps: Promise<any> | void | undefined;

    // 处理ModuleWithProviders情况
    if (!isFn && typeOrDef.providers?.length) {
        ps = eachProvider(typeOrDef.providers, pdr => injectProvider(injector, pdr));
    }


    const typeRef = moduleRefl ?? getClassRef<ModuleDef>(type);
    const annotation = typeRef.getAnnotation<ModuleDef>();
    if (annotation.module) {
        annotation.imports?.forEach(imp => {
            ps = mergePromise(ps, () => processInjectType(injector, imp, dedupStack, true, injectProvider, register));
        });

        if (annotation.providers) {
            const providers = annotation.providers;
            ps = mergePromise(ps, () => eachProvider(
                providers,
                pdr => injectProvider(injector, pdr)
            ))
        }

        const noDecl = !(imported && !(annotation.providedIn === 'root' || annotation.providedIn === 'platform'));

        ps = mergePromise(ps, () => processInjectDeclarations(injector, annotation, dedupStack, processProvider, register, noDecl));

    }

    return ps ? ps.then(() => register(injector, typeRef, undefined, extedOption, canRegister)) : register(injector, typeRef, undefined, extedOption, canRegister);
}



function processInjectDeclarations(
    injector: Injector,
    annotation: ModuleDef<any>,
    dedupStack: AbstractType[],
    injectProvider: InjectProvider,
    register: RegisterType,
    declarations?: boolean,
    ps?: Promise<void> | void): void | Promise<void> {
    const dps: Promise<void>[] = [];
    if (ps) dps.push(ps);

    if (declarations && annotation.declarations?.length) {
        const extedOption = (typeRef: ClassRef, option?: RegOption) => ({ static: false, ...option, declaration: true });
        annotation.declarations?.forEach(d => {
            const res = processInjectType(injector, d, dedupStack, true, injectProvider, register, extedOption);
            if (res) {
                dps.push(res);
            }
        });
    }
    if (annotation.exports?.length) {
        const extedOption = (typeRef: ClassRef, option?: RegOption) => typeRef.getAnnotation<ModuleDef>().module ? option : ({ static: false, ...option, declaration: true });
        annotation.exports?.forEach(d => {
            const res = processInjectType(injector, d, dedupStack, true, injectProvider, register, extedOption);
            if (res) {
                dps.push(res);
            }
        })
    }
    if (dps.length) return Promise.all(dps) as Promise<any>;
}


export function registerClass(
    injector: Injector,
    typeRef: ClassRef,
    option?: RegOption,
    extedOption?: RegisterExtedOption,
    canRegister?: CanRegister) {
    if (canRegister && !canRegister(typeRef, option)) return;
    if (extedOption) {
        option = extedOption(typeRef, option);
    }
    const providedIn = option?.providedIn ?? typeRef.getAnnotation().providedIn;
    return processRegister(injector.getRuntime().getInjector(providedIn, injector), typeRef, option)
}

export function processProvider(injector: Injector, p: TypeOption | StaticProvider | DynamicProvider): void | Promise<void> {
    if (isFunction(p)) {
        registerClass(injector, getClassRef(p))
    } else if (isPlainObject(p)) {
        if ((p as StaticProviders).provide) {
            registerProvider(injector, p as StaticProviders)
        } else if ((p as TypeOption).type) {

            registerClass(injector, getClassRef((p as TypeOption).type), p as TypeOption)

        } else if ((p as DynamicProvider).provider) {
            const pdrs = (p as DynamicProvider).provider(injector);
            if (isPromise(pdrs)) {
                return pdrs.then(ps => {
                    if (ps) Operator.inject(injector, ps);
                });
            }
            if (pdrs) Operator.inject(injector, pdrs);
        }
    }
}


/**
 * register provider.
 * @param provider 
 * @returns 
 */
function registerProvider(injector: Injector, provider: StaticProviders) {
    if (provider.asDefault && injector.has(provider.provide)) {
        return
    }
    const records = getRecords(injector);
    if (provider.multi) {
        let multiPdr = records.get(provider.provide);
        if (!multiPdr) {
            records.set(provider.provide, multiPdr = {
                fy: FnType.Fac,
                fn: MUTIL,
                value: Empty,
                deps: []
            })
        }
        if (multiPdr.deps) {
            const mtltk = generateRecord(injector, provider);
            if (isNumber(provider.multiOrder)) {
                multiPdr.deps.splice(provider.multiOrder, 0, mtltk)
            } else {
                multiPdr.deps.push(mtltk)
            }
        }
    } else {
        records.set(provider.provide, generateRecord(injector, provider))
    }
    provider.onRegistered?.(injector);
}


export function processRegister(injector: Injector, classRef: ClassRef, option?: RegOption) {
    // make sure class register once.
    const type = classRef.type;
    if (injector.has(classRef.type, InjectFlags.Default)) {
        return
    }

    // this.onRegister(classRef);
    let injectorType: ((type: AbstractType, typeRef: ClassRef) => void | Promise<void>) | undefined;
    if (option?.injectorType) {
        injectorType = (regType, typeRef) => processInjectType(
            injector,
            type,
            [],
            false,
            processProvider,
            registerClass,
            undefined,
            (tyref) => tyref.type !== regType,
            // (runtime, injector, tyref, ty) => {
            //     if (ty !== regType) {
            //         registerClass(runtime, injector, tyref, type)
            //     }
            // }, 
            typeRef)
    }

    const runtime = injector.getRuntime();
    const ctx = {
        injector,
        getRecords: () => getRecords(injector),
        ...option,
        injectorType,
        classRef,
        runtime,
        type
    } as DesignContext;

    runtime.designHandler.handle(ctx, null, {
        finally: () => {
            cleanObj(ctx);
        }
    });
}


export const IDENT = function <T>(value: T): T {
    return value
};
export const MUTIL = function <T>(...args: any): T[] {
    return args
};
export const CIRCULAR = IDENT;

/**
 * generate record.
 * @param injector 
 * @param provider 
 * @returns 
 */
export function generateRecord<T>(injector: Injector, provider: StaticProviders): FactoryRecord<T> {
    let fn: Function = IDENT;
    let value: T | undefined;
    let fnType = FnType.Fac;
    let type = provider.useClass;
    const isStatic = provider.static;
    let deps = provider.deps; //computeDeps(provider);
    if (isDefined(provider.useValue)) {
        value = provider.useValue
    } else if (provider.useFactory) {
        fn = provider.useFactory
    } else if (provider.useExisting) {
        // use ident.
        if (deps) {
            deps.unshift(provider.useExisting)
        } else {
            deps = [provider.useExisting]
        }

    } else if (provider.useClass) {
        if (deps) {
            deps.unshift(provider.useClass)
        } else {
            deps = [provider.useClass]
        }
        if (!injector.has(type, InjectFlags.Default)) {
            Operator.register(injector, { singleton: provider.singleton, type, deps, regProvides: false })
        }
    } else if (isFunction(provider.provide)) {
        if (deps) {
            fnType = FnType.Cotr;
            fn = provider.provide;
            type = provider.provide
        } else {
            deps = [provider.provide];
            type = provider.provide;
            if (!injector.has(type, InjectFlags.Default)) {
                Operator.register(injector, { singleton: provider.singleton, type, deps, regProvides: false })
            }
        }
    }
    return { value, fn, fy: fnType, deps, type, stic: isStatic }
}

const cirMsg = 'Circular dependency';
/**
 * circular dependency execption.
 */
export class CircularDependencyException extends Exception {
    constructor(message?: string) {
        super(message ? cirMsg + message : cirMsg)
    }
}

/**
 * Null injector execption.
 */
export class NullInjectorException extends Exception {
    constructor(token: Token) {
        super(`NullInjectorException: No provider for ${token?.toString()}!`)
    }
}

/**
 * resolve token.
 * @param rd 
 * @param provider 
 * @returns 
 */
export function tryResolveToken(token: Token, rd: FactoryRecord, runtime: Runtime, injector: Injector,
    raise: Injector, notFoundValue: any, flags: InjectFlags, isStatic?: boolean): any {
    try {
        const value = resolveToken(token, rd, runtime, injector, raise, notFoundValue, flags, isStatic);
        if (isStatic && rd.stic !== false
            && !(flags & InjectFlags.Resolve)
            && isNil(rd.value)
            && isDefined(value)
            && value !== notFoundValue) {

            rd.value = value
        }
        return value
    } catch (e) {
        if (rd && rd.value === CIRCULAR) {
            rd.value = Empty;
        }
        throw e
    }
}

export const THROW_FLAGE = {};

function invokeArgs(runtime: Runtime, injector: Injector, raise: Injector, deps: any[], isStatic?: boolean) {
    const args: any[] = [];
    for (let i = 0; i < deps.length; i++) {
        const dep = deps[i];
        let depFlags = InjectFlags.Default;
        let chlrd: FactoryRecord | undefined;
        let depToken: Token;

        if (isPlainObject(dep)) {
            chlrd = dep;
            depToken = dep.type;
        } else if (isArray(dep)) {
            depToken = dep[0];
            dep.forEach(d => {
                if (isNumber(d)) {
                    depFlags |= d;
                } else {
                    depToken = d;
                }
            });
            // if (!(depFlags & InjectFlags.SkipSelf)) {
            //     chlrd = getRecords(injector).get(depToken);
            // }
        } else {
            depToken = dep;
            // chlrd = getRecords(injector).get(depToken);
        }

        // const chlrd = isPlainObject(dep.token) ? dep.token : (dep.options & OptionFlags.CheckSelf ? records.get(dep.token) : undefined);

        // let val: any;
        // if (context && !(dep.token as FactoryRecord)?.fn) {
        //     val = context.resolveArgument(isString(dep.token) ? { name: dep.token } : { provider: dep.token })
        // } else {
        // val = raise.get(dep.token) // dep.options)
        const val = chlrd ? tryResolveToken(
            depToken,
            chlrd,
            runtime,
            injector,
            raise,
            depFlags & InjectFlags.Optional ? null : THROW_FLAGE,
            depFlags,
            chlrd?.stic || isStatic) : raise.get(depToken, undefined, depFlags)
        // }
        args.push(val);
    }

    return args;
}

/**
 * resolve token.
 * @param rd 
 * @param provider 
 * @returns 
 */
export function resolveToken(token: Token, rd: FactoryRecord, runtime: Runtime,
    injector: Injector, raise: Injector, notFoundValue: any, flags: InjectFlags, isStatic?: boolean): any {
    // if (rd && !(flags & InjectFlags.SkipSelf)) {
    let value = rd.value;
    if (value === CIRCULAR) {
        throw new CircularDependencyException()
    }
    if (isDefined(rd.value) && value !== Empty && (rd.stic || !(flags & InjectFlags.Resolve))) return rd.value;
    const deps = [];
    if (rd.fn === MUTIL) {
        const parent = injector?.getParent();
        if (parent && !(flags & InjectFlags.Self)) {
            const values = parent.get(token, null, flags, raise);
            if (values) {
                deps.push(...values)
            }
        }
    }
    // const context = raise instanceof InvocationContext ? raise : undefined;
    if (rd.deps?.length) {
        deps.push(...invokeArgs(runtime, injector, raise, rd.deps, isStatic))
    }
    if (rd.fn !== IDENT && rd.fn !== MUTIL && raise instanceof InvocationContext) {
        deps.push(raise)
    }
    switch (rd.fy) {
        case FnType.Cotr:
            return new (rd.fn as Type)(...deps)
        case FnType.Fac:
            if (value === Empty) {
                return rd.value = value = rd.fn?.(...deps)
            }
            return rd.fn?.(...deps)
        case FnType.Inj:
        default:
            if (rd.expires) {
                if (rd.expires < Date.now()) {
                    return rd.cache!
                }
                rd.expires = null!;
                rd.cache = null!;
            }
            return rd.fn?.(...deps)
    }
    // } else if (parent && !(flags & InjectFlags.Self)) {
    //     return parent.get(token, notFoundValue, ((flags & InjectFlags.Resolve) ? InjectFlags.Default | InjectFlags.Resolve : InjectFlags.Default) & InjectFlags.NonSingleton, raise)
    // } else if (!(flags & InjectFlags.Optional)) {
    //     if (notFoundValue === THROW_FLAGE) {
    //         throw new NullInjectorException(token)
    //     }
    //     return notFoundValue ?? null
    // } else {
    //     return notFoundValue ?? null
    // }
}

