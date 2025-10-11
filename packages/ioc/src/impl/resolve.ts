import { AbstractType, Type } from '../types';
import { InjectFlags, Token } from '../tokens';
import { isPlainObject } from '../utils/obj';
import { deepForEach } from '../utils/lang';
import { isArray, isDefined, isFunction, isNumber, isString, isNil } from '../utils/chk';
import { FnType,  FactoryRecord, Injector,  DependencyRecord, OptionFlags, RegOption} from '../injector';
import { Exception } from '../exception';
import { Runtime } from '../runtime';
import { getClassRef } from '../metadata/refl';
import { ModuleDef, ClassRef } from '../metadata/class';
import { ModuleWithProviders, Provider, DynamicProvider, StaticProvider, StaticProviders } from '../providers';
import { InvocationContext } from '../context';



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

export function processInjectorType(
    typeOrDef: AbstractType | ModuleWithProviders,
    dedupStack: AbstractType[],
    processProvider: (provider: StaticProvider | DynamicProvider) => void,
    regType: (typeRef: ClassRef, type: AbstractType, option?: RegOption) => void,
    moduleRefl?: ClassRef,
    imported?: boolean): void | Promise<void> {
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
        ps = eachProvider(typeOrDef.providers, pdr => processProvider(pdr));
    }


    const typeRef = moduleRefl ?? getClassRef<ModuleDef>(type);
    const annotation = typeRef.getAnnotation<ModuleDef>();
    if (annotation.module) {
        annotation.imports?.forEach(imp => {
            ps = mergePromise(ps, () => processInjectorType(imp, dedupStack, processProvider, regType, undefined, true));
        });

        if (annotation.providers) {
            const providers = annotation.providers;
            ps = mergePromise(ps, () => eachProvider(
                providers,
                pdr => processProvider(pdr)
            ))
        }

        const noDecl = !(imported && !(annotation.providedIn === 'root' || annotation.providedIn === 'platform'));

        ps = mergePromise(ps, () => processInjectoDeclarations(annotation, dedupStack, processProvider, regType, noDecl));

    }

    return ps ? ps.then(() => regType(typeRef, type)) : regType(typeRef, type);

}


function processInjectoDeclarations(annotation: ModuleDef<any>, dedupStack: AbstractType[],
    processProvider: (provider: StaticProvider | DynamicProvider, providers?: any[]) => void,
    regType: (typeRef: ClassRef, type: AbstractType, option?: RegOption) => void, declarations?: boolean, ps?: Promise<void> | void): void | Promise<void> {
    const dps: Promise<void>[] = [];
    if (ps) dps.push(ps);

    if (declarations && annotation.declarations?.length) {
        const regFn = (typeRef: ClassRef, type: AbstractType, option?: RegOption) => regType(typeRef, type, { static: false, ...option, declaration: true });
        annotation.declarations?.forEach(d => {
            const res = processInjectorType(d, dedupStack, processProvider, regFn, undefined, true);
            if (res) {
                dps.push(res);
            }
        });
    }
    if (annotation.exports?.length) {
        const regFn = (typeRef: ClassRef, type: AbstractType, option?: RegOption) => regType(typeRef, type, typeRef.getAnnotation<ModuleDef>().module ? option : { static: false, ...option, declaration: true });
        annotation.exports?.forEach(d => {
            const res = processInjectorType(d, dedupStack, processProvider, regFn, undefined, true);
            if (res) {
                dps.push(res);
            }
        })
    }
    if (dps.length) return Promise.all(dps) as Promise<any>;
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
export function generateRecord<T>(platfrom: Runtime, injector: Injector, provider: StaticProviders): FactoryRecord<T> {
    let fn: Function = IDENT;
    let value: T | undefined;
    let fnType = FnType.Fac;
    let type = provider.useClass;
    const isStatic = provider.static;
    let deps = computeDeps(provider);
    if (isDefined(provider.useValue)) {
        value = provider.useValue
    } else if (provider.useFactory) {
        fn = provider.useFactory
    } else if (provider.useExisting) {
        // use ident.

    } else if (provider.useClass) {
        if (deps) {
            deps.unshift({ token: provider.useClass, options: OptionFlags.Default })
        } else {
            deps = [{ token: provider.useClass, options: OptionFlags.Default }]
        }
        if (!injector.has(type, InjectFlags.Default)) {
            injector.register({ singleton: provider.singleton, type, deps, regProvides: false })
        }
    } else if (isFunction(provider.provide)) {
        if (deps) {
            fnType = FnType.Cotr;
            fn = provider.provide;
            type = provider.provide
        } else {
            deps = [{ token: provider.provide, options: OptionFlags.Default }];
            type = provider.provide;
            if (!injector.has(type, InjectFlags.Default)) {
                injector.register({ singleton: provider.singleton, type, deps, regProvides: false })
            }
        }
    }
    return { value, fn, fy: fnType, deps, type, stic: isStatic }
}

function computeDeps(provider: StaticProviders): DependencyRecord[] {
    let deps: any[] = null!;
    const pdrdeps = provider.deps;
    if (pdrdeps && pdrdeps.length) {
        deps = pdrdeps.map(dep => {
            let options = OptionFlags.Default;
            let token = dep;
            if (isArray(dep)) {
                for (let i = 0; i < dep.length; i++) {
                    const d = dep[i];
                    if (isNumber(d)) {
                        switch (d) {
                            case InjectFlags.Optional:
                                options = options | OptionFlags.Optional;
                                break
                            case InjectFlags.SkipSelf:
                                options = options & ~OptionFlags.CheckSelf;
                                break
                            case InjectFlags.Self:
                                options = options & ~OptionFlags.CheckParent;
                                break
                        }
                    } else {
                        token = d
                    }
                }
            }
            return { token, options }
        });
    } else if (provider.useExisting) {
        deps = [{ token: provider.useExisting, options: OptionFlags.Default }]
    }
    return deps
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
export function tryResolveToken(token: Token, rd: FactoryRecord | undefined, records: Map<any, FactoryRecord>, platform: Runtime, parent: Injector | null,
    context: InvocationContext | undefined, notFoundValue: any, flags: InjectFlags, isStatic?: boolean): any {
    try {
        const value = resolveToken(token, rd, records, platform, parent, context, notFoundValue, flags, isStatic);
        const isDef = isDefined(value) && value !== notFoundValue;
        if (isDef && isStatic) { // && rd?.fn !== MUTIL) {
            if (rd) {
                if (isNil(rd.value) && (rd.stic || !(flags & InjectFlags.Resolve))) {
                    rd.value = value
                }
            } else {
                records.set(token, { value })
            }
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

/**
 * resolve token.
 * @param rd 
 * @param provider 
 * @returns 
 */
export function resolveToken(token: Token, rd: FactoryRecord | undefined, records: Map<any, FactoryRecord>, platform: Runtime, parent: Injector | null,
    context: InvocationContext | undefined, notFoundValue: any, flags: InjectFlags, isStatic?: boolean): any {
    if (rd && !(flags & InjectFlags.SkipSelf)) {
        let value = rd.value;
        if (value === CIRCULAR) {
            throw new CircularDependencyException()
        }
        if (isDefined(rd.value) && value !== Empty && (rd.stic || !(flags & InjectFlags.Resolve))) return rd.value;
        const deps = [];
        if (rd.fn === MUTIL) {
            if (parent && !(flags & InjectFlags.Self)) {
                const values = parent.get(token, null, InjectFlags.Default, context);
                if (values) {
                    deps.push(...values)
                }
            }
        }
        if (rd.deps?.length) {
            for (let i = 0; i < rd.deps.length; i++) {
                const dep = rd.deps[i];
                const chlrd = isPlainObject(dep.token) ? dep.token : (dep.options & OptionFlags.CheckSelf ? records.get(dep.token) : undefined);

                let val: any;
                if (context && !(dep.token as FactoryRecord)?.fn) {
                    val = context.resolveArgument(isString(dep.token) ? { name: dep.token } : { provider: dep.token })
                }
                deps.push(val ?? tryResolveToken(
                    dep.token,
                    chlrd,
                    records,
                    platform,
                    !chlrd && !(dep.options & OptionFlags.CheckParent) ? null : parent,
                    context,
                    dep.options & OptionFlags.Optional ? null : THROW_FLAGE,
                    flags,
                    isStatic))
            }
        }
        if (context && rd.fn !== IDENT && rd.fn !== MUTIL) {
            deps.push(context)
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
    } else if (parent && !(flags & InjectFlags.Self)) {
        return parent.get(token, notFoundValue, (flags & InjectFlags.Resolve) ? InjectFlags.Default | InjectFlags.Resolve : InjectFlags.Default, context)
    } else if (!(flags & InjectFlags.Optional)) {
        if (notFoundValue === THROW_FLAGE) {
            throw new NullInjectorException(token)
        }
        return notFoundValue ?? null
    } else {
        if (notFoundValue === THROW_FLAGE) {
            throw new NullInjectorException(token)
        }
        return notFoundValue ?? null
    }
}

