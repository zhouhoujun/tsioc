import { Type, Registered, IProvider, Abstract, ProviderType, IInjector, Destroyable, Token, isFunction, lang, refl, InjectorImpl, Injector, Strategy, isNil, ProviderState, Provider } from '@tsdi/ioc';
import { ModuleReflect } from '../reflect';

/**
 * module registered state.
 */
export interface ModuleRegistered extends Registered {
    moduleRef?: ModuleRef;
}


/**
 * module exports provider.
 */
export interface IModuleProvider extends IProvider {
    /**
     * export moduleRefs.
     */
    exports: ModuleRef[]
    /**
     * export type.
     * @param type 
     */
    export(type: Type, noRef?: boolean);
}

/**
 * di module ref.
 */
@Abstract()
export abstract class ModuleRef<T = any> extends InjectorImpl {

    private _type: Type<T>;
    private _refl: ModuleReflect<T>;

    deps: ModuleRef[];

    constructor(_type: Type<T> | ModuleReflect<T>, protected _parent?: IInjector, protected _regIn?: string | 'root', strategy?: Strategy) {
        super(_parent, strategy)
        if (isFunction(_type)) {
            this._type = _type;
            this._refl = refl.get(_type);
        } else {
            this._type = _type.type;
            this._refl = _type;
        }
        this.deps = [];
        this.regType(this._type);
    }

    /**
     * module type.
     */
    get type(): Type<T> {
        return this._type;
    }

    get regIn(): string | 'root' {
        return this._regIn ?? this._refl.regIn;
    }

    get injector(): IInjector {
        return this;
    }
    /**
     * di module instance.
     */
    abstract get instance(): T;
    /**
     * di module exports.
     */
    abstract get exports(): IModuleProvider;

    protected destroying() {
        super.destroying();
        this.deps.forEach(d=> d.destroy());
        this.deps = null;
        this._refl = null;
        this._type = null;
    }

}


@Abstract()
export abstract class ModuleFactory {
    abstract create<T>(type: Type<T> | ModuleReflect<T>, parent?: IInjector): ModuleRef<T>;
}

