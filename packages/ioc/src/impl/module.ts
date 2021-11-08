import { Injector, InjectorScope, Platform, ProviderType, TypeOption } from '../injector';
import { get } from '../metadata/refl';
import { TARGET } from '../metadata/tk';
import { ModuleReflect } from '../metadata/type';
import { ModuleFactory, ModuleOption } from '../module.factory';
import { ModuleRef } from '../module.ref';
import { InjectorTypeWithProviders, StaticProvider } from '../providers';
import { InjectFlags, Token } from '../tokens';
import { Modules, Type } from '../types';
import { EMPTY, isFunction, isPlainObject } from '../utils/chk';
import { deepForEach } from '../utils/lang';
import { DefaultInjector, tryResolveToken } from './injector';

export class DefaultModuleRef<T> extends DefaultInjector implements ModuleRef<T> {

    private _instance!: T;
    private defTypes = new Set<Type>();
    private _type: Type;
    private _typeRefl: ModuleReflect;
    constructor(moduleType: ModuleReflect, providers: ProviderType[] | undefined, readonly parent: Injector, readonly scope?: InjectorScope) {
        super(providers, parent, scope);
        const dedupStack: Type[] = [];
        this._typeRefl = moduleType;
        this._type = moduleType.type as Type;
        this.setValue(ModuleRef, this);
        this.processInjectorType(this.platform(), this._type, dedupStack, this.moduleReflect);
        this._instance = this.get(this._type);
    }

    get moduleType() {
        return this._type;
    }

    get moduleReflect() {
        return this._typeRefl;
    }


    get injector(): Injector {
        return this;
    }

    get instance(): T {
        return this._instance;
    }

    protected override isself(token: Token): boolean {
        return token === ModuleRef || super.isself(token);
    }

    // override get<T>(token: Token<T>, notFoundValue?: T, flags = InjectFlags.Default): T {
    //     this.assertNotDestroyed();
    //     return tryResolveToken(token, this.records.get(token), this.records, this.platform(), this.parent, notFoundValue, flags);
    // }

    protected processInjectorType(platform: Platform, typeOrDef: Type | InjectorTypeWithProviders, dedupStack: Type[], moduleRefl?: ModuleReflect) {
        const type = isFunction(typeOrDef) ? typeOrDef : typeOrDef.module;
        if (!isFunction(typeOrDef)) {
            deepForEach(
                typeOrDef.providers,
                pdr => this.processProvider(platform, pdr, typeOrDef.providers),
                v => isPlainObject(v) && !v.provide
            );
        }
        const isDuplicate = dedupStack.indexOf(type) !== -1;
        const typeRef = moduleRefl ?? get<ModuleReflect>(type);
        if (typeRef.module && !isDuplicate) {
            dedupStack.push(type);
            typeRef.imports?.forEach(imp => {
                this.processInjectorType(platform, imp, dedupStack);
            });

            if (typeRef.declarations) {
                typeRef.declarations.forEach(d => {
                    this.processInjectorType(platform, d, dedupStack);
                });
            }
        }

        this.defTypes.add(type);
        this.registerType(platform, type);
        if (typeRef.providers && !isDuplicate) {
            deepForEach(
                typeRef.providers,
                pdr => this.processProvider(platform, pdr, typeRef.providers),
                v => isPlainObject(v) && !v.provide
            );
        }
    }

    protected override destroying() {
        super.destroying();
        this._type = null!;
        this._typeRefl = null!;
        this._instance = null!;
    }

}


export class DefaultModuleFactory<T = any> extends ModuleFactory<T> {
    
    private _moduleType: Type;
    private _moduleRefl: ModuleReflect;
    constructor(moduleType: Type<T> | ModuleReflect<T>) {
        super();
        if (isFunction(moduleType)) {
            this._moduleType = moduleType;
            this._moduleRefl = get(moduleType);
        } else {
            this._moduleRefl = moduleType;
            this._moduleType = moduleType.type as Type;
        }
    }

    get moduleType() {
        return this._moduleType;
    }

    get moduleReflect() {
        return this._moduleRefl;
    }

    create(parent: Injector, option?: ModuleOption): ModuleRef<T> {
        return new DefaultModuleRef(this.moduleReflect, option?.providers, parent, option?.scope);
    }
}


export const DEFAULTA_MODULE_FACTORYS: ProviderType[] = [
    { provide: ModuleFactory, useClass: DefaultModuleFactory, deps: [TARGET] }
]

// export class DefaultModuleFactory<T = any> extends ModuleFactory<T> {

//     private _modelRefl: ModuleReflect<T>;
//     constructor(modelRefl: ModuleReflect<T> | Type<T>) {
//         super();
//         this._modelRefl = isFunction(modelRefl) ? get(modelRefl) : modelRefl;
//     }

//     override get moduleType() {
//         return this._modelRefl?.type;
//     }

//     override create(parent: Injector, option?: ModuleOption): ModuleRef<T> {
//         let inj: ModuleRef;
//         if ((parent as ModuleRef)?.moduleType === this._modelRefl.type) {
//             inj = parent as ModuleRef;
//         } else {
//             inj = createModuleInjector(this._modelRefl, option?.providers, parent || option?.injector, option);
//         }
//         this.regModule(inj);
//         return inj;
//     }

//     protected regModule(inj: ModuleRef) {
//         const state = inj.platform();
//         const regInRoot = inj.regIn === 'root';
//         if (inj.reflect.imports) {
//             inj.register(inj.reflect.imports);
//             inj.reflect.imports.forEach(ty => {
//                 const importRef = state.getRegistered<ModuleRegistered>(ty)?.moduleRef;
//                 if (importRef) {
//                     inj.imports.unshift(importRef);
//                 }
//                 if (regInRoot) {
//                     inj.exports.export(ty, false, true);
//                 }
//             })
//         }
//         if (inj.reflect.declarations) {
//             inj.register(inj.reflect.declarations);
//             if (regInRoot) {
//                 inj.reflect.declarations.forEach(d => inj.exports.export(d, true, true));
//             }
//         }
//         if (inj.reflect.annotation?.providers) {
//             inj.exports.inject(inj.reflect.annotation.providers);
//         }

//         inj.reflect.exports?.forEach(ty => inj.exports.export(ty));
//         if (inj.exports.size && inj.parent instanceof ModuleInjector && inj.parent.isRoot) {
//             inj.parent.imports.push(inj);
//         }
//     }

// }

// export function createModuleInjector(type: ModuleReflect | Type, providers?: ProviderType[], parent?: Injector,
//     option: {
//         scope?: string | InjectorScope;
//         providedIn?: string;
//         deps?: Modules[];
//         args?: any[];
//         baseURL?: string;
//     } = {}) {

//     let inj = new DefaultModuleRef(isFunction(type) ? get<ModuleReflect>(type) : type, providers, option.scope);
//     if (option.deps) {
//         inj.use(option.deps);
//     }
//     return inj;
// }
