
import { Injector, InjectorScope, ProviderType } from '../injector';
import { get } from '../metadata/refl';
import { ModuleReflect } from '../metadata/type';
import { ModuleFactory, ModuleOption } from '../module.factory';
import { ModuleRef } from '../module.ref';
import { InjectFlags, Token } from '../tokens';
import { Modules, Type } from '../types';
import { isFunction } from '../utils/chk';
import { DefaultInjector, tryResolveToken } from './injector';

export class DefaultModuleRef<T> extends DefaultInjector implements ModuleRef<T> {

    private _instance!: T;
    constructor(readonly moduleType: Type<T>, readonly parent: Injector, readonly scope?: InjectorScope) {
        super()
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

    protected override isSelf(token: Token): boolean {
        if (token === ModuleRef) return true;
        return super.isSelf(token);
    }

    get<T>(token: Token<T>, notFoundValue?: T, injectFlags = InjectFlags.Default): T {
        if (this.isSelf(token)) return this as any;
        return tryResolveToken(token, this.factories.get(token), this.factories, this.parent, notFoundValue, injectFlags);
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
