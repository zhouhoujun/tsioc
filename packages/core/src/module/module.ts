
import {
    DefaultInjector, Injector, InjectorScope, InjectorTypeWithProviders, isFunction, Platform,
    ModuleReflect, Modules, processInjectorType, ProviderType, refl, Token, Type
} from '@tsdi/ioc';
import { ModuleFactory, ModuleFactoryResolver, ModuleOption } from '../module.factory';
import { ModuleRef } from '../module.ref';
import { RunnableFactoryResolver } from '../runnable';
import { DefaultRunnableFactoryResolver } from './runnable';


/**
 * default modeuleRef implements {@link ModuleRef}
 */
export class DefaultModuleRef<T> extends DefaultInjector implements ModuleRef<T> {

    private _instance!: T;
    private _defs = new Set<Type>();
    private _type: Type;
    private _typeRefl: ModuleReflect;

    readonly runnableFactoryResolver: RunnableFactoryResolver = new DefaultRunnableFactoryResolver(this);

    constructor(moduleType: ModuleReflect, providers: ProviderType[] | undefined, readonly parent: Injector, readonly scope?: InjectorScope, deps?: Modules[]) {
        super(undefined, parent, scope);
        const dedupStack: Type[] = [];
        this._typeRefl = moduleType;
        this._type = moduleType.type as Type;
        this.inject({ provide: RunnableFactoryResolver, useValue: this.runnableFactoryResolver });
        this.setValue(ModuleRef, this);
        deps && this.use(deps);
        providers && this.inject(providers);
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

    protected processInjectorType(platform: Platform, typeOrDef: Type | InjectorTypeWithProviders, dedupStack: Type[], moduleRefl?: ModuleReflect) {
        processInjectorType(typeOrDef, dedupStack,
            (pdr, pdrs) => this.processProvider(platform, pdr, pdrs),
            (tyref, type) => {
                this._defs.add(type);
                this.registerReflect(platform, tyref);
            }, moduleRefl);
    }

    protected override destroying() {
        super.destroying();
        this._defs.clear();
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
            this._moduleRefl = refl.get(moduleType);
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
        return new DefaultModuleRef(this.moduleReflect, option?.providers, parent, option?.scope, option?.deps);
    }
}

export class DefaultModuleFactoryResolver extends ModuleFactoryResolver {
    resolve<T>(type: Type<T> | ModuleReflect<T>): ModuleFactory<T> {
        return new DefaultModuleFactory(type);
    }
}
