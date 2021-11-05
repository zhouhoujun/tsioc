import { Injector, InjectorScope, Platform, ProviderType, TypeOption } from '../injector';
import { get } from '../metadata/refl';
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
    constructor(readonly moduleType: Type<T>, providers: ProviderType[], readonly parent: Injector, readonly scope?: InjectorScope) {
        super(providers, parent, scope);
        const dedupStack: Type[] = [];
        this.setValue(ModuleRef, this);
        deepForEach([moduleType], type => this.processInjectorType(type, this.platform(), dedupStack));
    }


    get injector(): Injector {
        return this;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.resolve({ token: this.moduleType, regify: true });
        }
        return this._instance;
    }

    protected override isself(token: Token): boolean {
        return token === ModuleRef || super.isself(token);
    }

    override get<T>(token: Token<T>, notFoundValue?: T, flags = InjectFlags.Default): T {
        this.assertNotDestroyed();
        return tryResolveToken(token, this.records.get(token), this.records, this.platform(), this.parent, notFoundValue, flags);
    }

    protected processInjectorType(typeOrDef: Type | InjectorTypeWithProviders, platform: Platform, dedupStack: Type[]) {
        const type = isFunction(typeOrDef) ? typeOrDef : typeOrDef.module;
        if (!isFunction(typeOrDef)) {
            deepForEach(
                typeOrDef.providers,
                pdr => this.processProvider(platform, pdr, typeOrDef.providers, type),
                v => isPlainObject(v) && !v.provide
            );
        }
        const isDuplicate = dedupStack.indexOf(type) !== -1;
        const typeRef = get<ModuleReflect>(type);
        if (typeRef.module && !isDuplicate) {
            dedupStack.push(type);
            typeRef.imports?.forEach(imp => {
                this.processInjectorType(imp, platform, dedupStack);
            });

            if (typeRef.declarations) {
                typeRef.declarations.forEach(d => {
                    this.processInjectorType(d, platform, dedupStack);
                });
            }
        }

        this.defTypes.add(type);
        this.registerType(platform, type);
        if (typeRef.providers && !isDuplicate) {
            deepForEach(
                typeRef.providers,
                pdr => this.processProvider(platform, pdr, typeRef.providers, type),
                v => isPlainObject(v) && !v.provide
            );
        }
    }

    protected override processProvider(platform: Platform, provider: Injector | TypeOption | StaticProvider, providers?: ProviderType[], moduleType?: Type): void {
        super.processProvider(platform, provider, providers);
    }

}


export class DefaultModuleFactory<T = any> extends ModuleFactory<T> {
    constructor(public moduleType: Type<T>) {
        super();

    }

    create(parent: Injector, option?: ModuleOption): ModuleRef<T> {

    }

    protected registerModule(moduleType: Type) {
        this.recurse(moduleType, new Set());
    }

    protected recurse(moduleType: Type, visited: Set<Type>) {
        const imports = get<ModuleReflect>(moduleType)?.imports || [];
        for (let i of imports) {

        }
    }
}

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
