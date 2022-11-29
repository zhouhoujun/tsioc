
import {
    DefaultInjector, Injector, InjectorScope, ModuleWithProviders, refl, isFunction,
    Platform, ModuleDef, processInjectorType, Token, Type, lang,
    LifecycleHooksResolver, LifecycleHooks, DestroyLifecycleHooks,
    isPlainObject, isArray, EMPTY_OBJ, isClass, isModuleProviders, EMPTY, ReflectiveFactory, DefaultReflectiveFactory
} from '@tsdi/ioc';
import { Subscription } from 'rxjs';
import { ApplicationEventMulticaster } from '../events';
import { OnDispose, OnShutdown, ModuleLifecycleHooks, Hooks } from '../lifecycle';
import { ModuleOption, ModuleRef, ModuleType } from '../module.ref';
import { RunnableFactory } from '../runnable';
import { DefaultRunnableFactory } from './runnable';


/**
 * default modeuleRef implements {@link ModuleRef}
 */
export class DefaultModuleRef<T = any> extends DefaultInjector implements ModuleRef<T> {

    private _instance!: T;
    private _defs = new Set<Type>();
    private _type: Type;
    private _typeRefl: ModuleDef;

    reflectiveFactory = new DefaultReflectiveFactory();
    runnableFactory: RunnableFactory = new DefaultRunnableFactory(this);

    lifecycle!: ModuleLifecycleHooks;

    constructor(moduleType: ModuleDef, parent: Injector, option: ModuleOption = EMPTY_OBJ) {
        super(undefined, parent, option?.scope as InjectorScope ?? moduleType.type as Type);
        const dedupStack: Type[] = [];
        this.isStatic = moduleType.static || option.isStatic;
        this._typeRefl = moduleType;
        this._type = moduleType.type as Type;

        this.inject(
            { provide: ReflectiveFactory, useValue: this.reflectiveFactory },
            { provide: RunnableFactory, useValue: this.runnableFactory }
        );

        this.setValue(ModuleRef, this);
        const platfrom = this.platform();
        platfrom.modules.set(this._type, this);
        option.deps && this.use(option.deps);
        option.providers && this.inject(option.providers);
        this.processInjectorType(platfrom, this._type, dedupStack, this.moduleReflect);
        option.uses && this.use(option.uses);
        this._instance = this.get(this._type)
    }

    get moduleType() {
        return this._type
    }

    get moduleReflect() {
        return this._typeRefl
    }

    protected override createLifecycle(): LifecycleHooks {
        const platform = this.scope === 'root' ? this.platform() : undefined;
        const lifecycle = this.get(LifecycleHooksResolver, null)?.resolve(platform) ?? new DefaultModuleLifecycleHooks(platform);
        (lifecycle as DefaultModuleLifecycleHooks).eventMulticaster = this.get(ApplicationEventMulticaster, null)!;
        return lifecycle
    }

    get injector(): Injector {
        return this
    }

    get instance(): T {
        return this._instance
    }

    protected override isself(token: Token): boolean {
        return token === ModuleRef || super.isself(token)
    }

    import(typeOrDef: Type | ModuleWithProviders, children?: boolean) {
        if (children) {
            createModuleRef(typeOrDef, this)
        } else {
            this.processInjectorType(this.platform(), typeOrDef, [], this.moduleReflect)
        }
    }

    override use(modules: ModuleType[]): Type[];
    override use(...modules: ModuleType[]): Type[];
    override use(...args: any[]): Type[] {
        this.assertNotDestroyed();
        const types: Type[] = [];
        const platform = this.platform();
        const stk: Type[] = [];
        lang.deepForEach(args, ty => {
            if (isClass(ty)) {
                types.push(ty);
                this.processInjectorType(platform, ty, stk)
            } else if (isFunction(ty.module) && isArray(ty.providers)) {
                types.push(ty.module);
                this.processInjectorType(platform, ty, stk)
            }
        }, v => isPlainObject(v) && !(isFunction(v.module) && isArray(v.providers)));
        return types
    }

    protected processInjectorType(platform: Platform, typeOrDef: Type | ModuleWithProviders, dedupStack: Type[], moduleRefl?: ModuleDef) {
        processInjectorType(typeOrDef, dedupStack,
            (pdr, pdrs) => this.processProvider(platform, pdr, pdrs),
            (tyref, type) => {
                this._defs.add(type);
                this.registerReflect(platform, tyref)
            }, moduleRefl)
    }

    protected override destroying() {
        this.platform()?.modules.delete(this._type);
        super.destroying();
        this._defs.clear();
        this._type = null!;
        this.lifecycle.clear();
        this.lifecycle = null!;
        this.runnableFactory = null!;
        this.reflectiveFactory = null!;
        this._typeRefl = null!;
        this._instance = null!
    }

}

/**
 * create module ref.
 */
export function createModuleRef<T>(module: Type<T> | ModuleDef<T> | ModuleWithProviders<T>, parent: Injector, option?: ModuleOption): ModuleRef<T> {
    if (isFunction(module)) return new DefaultModuleRef(refl.get<ModuleDef>(module), parent, option);
    if (isModuleProviders(module)) return new DefaultModuleRef(refl.get<ModuleDef>(module.module), parent, {
        ...option,
        providers: [...module.providers ?? EMPTY, ...option?.providers ?? EMPTY]
    });
    return new DefaultModuleRef(module, parent, option)
}


export class DefaultModuleLifecycleHooks extends DestroyLifecycleHooks implements ModuleLifecycleHooks {
    private _disposes = new Set<OnDispose>();
    private _shutdowns = new Set<OnShutdown>();
    private _disposed = true;
    private _shutdowned = true;
    private _appEventSubs: Subscription[] = [];
    eventMulticaster!: ApplicationEventMulticaster;

    constructor(platform?: Platform) {
        super(platform);
    }

    clear(): void {
        this._disposes.clear();
        this._shutdowns.clear();
        super.clear();
    }

    get disposed(): boolean {
        return this._disposed
    }

    get shutdown(): boolean {
        return this._shutdowned
    }

    get destroyable(): boolean {
        return this._shutdowned && this._disposed
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
        this._appEventSubs?.forEach(e => e && e.unsubscribe());
        this._appEventSubs = [];
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
        const { onDestroy, onDispose, onApplicationEvent, onApplicationShutdown } = (target as Hooks);
        if (isFunction(onDestroy)) {
            this.regDestory(target);
        }
        if (isFunction(onDispose)) {
            this.regDispose(target);
        }
        if (isFunction(onApplicationEvent)) {
            this._appEventSubs.push(target.onApplicationEvent(this.eventMulticaster));
        }
        if (isFunction(onApplicationShutdown)) {
            this.regShutdown(target);
        }

    }

    protected regDispose(hook: OnDispose): void {
        this._disposed = false;
        this._disposes.add(hook);
    }

    protected regShutdown(hook: OnShutdown): void {
        this._shutdowned = false;
        this._shutdowns.add(hook);
    }
}

export class ModuleLifecycleHooksResolver implements LifecycleHooksResolver {
    resolve(plaform?: Platform): LifecycleHooks {
        return new DefaultModuleLifecycleHooks(plaform)
    }

}