
import {
    DefaultInjector, Injector, InjectorScope, InjectorTypeWithProviders, refl, isFunction, DestroyLifecycleHooks,
    Platform, ModuleReflect, Modules, processInjectorType, ProviderType, Token, Type, ClassType, OperationFactory,
    TypeReflect, DefaultOperationFactory, OperationFactoryResolver, LifecycleHooksResolver, LifecycleHooks, lang
} from '@tsdi/ioc';
import { OnDispose, OnShutdown, ModuleLifecycleHooks, Hooks } from '../lifecycle';
import { ModuleFactory, ModuleFactoryResolver, ModuleOption } from '../module.factory';
import { ModuleRef } from '../module.ref';
import { RunnableFactoryResolver } from '../runnable';
import { DefaultRunnableFactoryResolver } from './runnable';



/**
 * default modeuleRef implements {@link ModuleRef}
 */
export class DefaultModuleRef<T = any> extends DefaultInjector implements ModuleRef<T> {

    private _instance!: T;
    private _defs = new Set<Type>();
    private _type: Type;
    private _typeRefl: ModuleReflect;

    runnableFactoryResolver: RunnableFactoryResolver = new DefaultRunnableFactoryResolver(this);
    operationFactoryResolver = new ModuleOperationFactoryResolver();
    lifecycle!: ModuleLifecycleHooks;

    constructor(moduleType: ModuleReflect, providers: ProviderType[] | undefined, readonly parent: Injector,
        readonly scope?: InjectorScope, deps?: Modules[]) {
        super(undefined, parent, scope ?? moduleType.type as Type);
        const dedupStack: Type[] = [];
        this._typeRefl = moduleType;
        this._type = moduleType.type as Type;
        this.inject(
            { provide: RunnableFactoryResolver, useValue: this.runnableFactoryResolver },
            { provide: OperationFactoryResolver, useValue: this.operationFactoryResolver }
        );

        this.setValue(ModuleRef, this);
        const platfrom = this.platform();
        platfrom.modules.add(this);
        deps && this.use(deps);
        providers && this.inject(providers);
        this.processInjectorType(platfrom, this._type, dedupStack, this.moduleReflect);
        this._instance = this.get(this._type);
    }

    get moduleType() {
        return this._type;
    }

    get moduleReflect() {
        return this._typeRefl;
    }

    protected createLifecycle(): LifecycleHooks {
        let platform = this.scope === 'root' ? this.platform() : undefined;
        return this.get(LifecycleHooksResolver)?.resolve(platform) ?? new DefaultModuleLifecycleHooks(platform);
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
        this.platform()?.modules.delete(this);
        super.destroying();
        this._defs.clear();
        this._type = null!;
        this.lifecycle.clear();
        this.lifecycle = null!;
        this.operationFactoryResolver = null!;
        this.runnableFactoryResolver = null!;
        this._typeRefl = null!;
        this._instance = null!;
    }

}



export class DefaultModuleLifecycleHooks extends DestroyLifecycleHooks implements ModuleLifecycleHooks {
    private _disposes = new Set<OnDispose>();
    private _shutdowns = new Set<OnShutdown>();
    private _disposed = true;
    private _shutdowned = true;

    constructor(platform?: Platform) {
        super(platform);
    }

    clear(): void {
        this._disposes.clear();
        this._shutdowns.clear();
        super.clear();
    }

    get disposed(): boolean {
        return this._disposed;
    }

    get shutdown(): boolean {
        return this._shutdowned;
    }

    get destroyable(): boolean {
        return this._shutdowned && this._disposed;
    }

    override async dispose(): Promise<void> {
        if (this.destroyable) return;
        if (this.platform) {
            await Promise.all(Array.from(this.platform.modules.values())
                .reverse()
                .map(m => {
                    return m.lifecycle === this ? lang.step([
                        () => this.runShutdown(),
                        () => this.runDisoise()
                    ]) : m.lifecycle.dispose();
                }));
        } else {
            await this.runShutdown();
            await this.runDisoise();
        }
    }

    async runDisoise(): Promise<void> {
        this._disposed = true;
        await Promise.all(Array.from(this._disposes.values()).map(s => s && s.onDispose()));
    }

    async runShutdown(): Promise<void> {
        this._shutdowned = true;
        await Promise.all(Array.from(this._shutdowns.values()).map(s => s && s.onApplicationShutdown()));
    }

    runDestroy(): any {
        if (this.destroyable) {
            super.runDestroy();
        }
    }

    register(target: any): void {
        const { onDestroy, onDispose, onApplicationShutdown } = (target as Hooks);
        if (isFunction(onDestroy)) {
            this.regDestory(target);
        }
        if (isFunction(onDispose)) {
            this.regDispise(target);
        }
        if (isFunction(onApplicationShutdown)) {
            this.regShutdown(target);
        }
    }

    protected regDispise(hook: OnDispose): void {
        this._disposed = false;
        this._disposes.add(hook);
    }

    protected regShutdown(hook: OnShutdown): void {
        this._shutdowned = false;
        this._shutdowns.add(hook);
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
        return new DefaultModuleRef(this.moduleReflect, option?.providers, parent, option?.scope as InjectorScope, option?.deps);
    }
}

export class DefaultModuleFactoryResolver extends ModuleFactoryResolver {
    resolve<T>(type: Type<T> | ModuleReflect<T>): ModuleFactory<T> {
        return new DefaultModuleFactory(type);
    }
}

export class ModuleOperationFactoryResolver extends OperationFactoryResolver {
    resolve<T>(type: ClassType<T> | TypeReflect<T>): OperationFactory<T> {
        return new DefaultOperationFactory(type);
    }
}


export class ModuleLifecycleHooksResolver implements LifecycleHooksResolver {
    resolve(plaform?: Platform): LifecycleHooks {
        return new DefaultModuleLifecycleHooks(plaform);
    }

}