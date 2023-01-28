
import {
    DefaultInjector, Injector, InjectorScope, ModuleWithProviders, refl, isFunction,
    Platform, ModuleDef, processInjectorType, Token, Type, lang, DestroyLifecycleHooks, LifecycleHooksResolver, LifecycleHooks,
    isPlainObject, isArray, EMPTY_OBJ, isClass, isModuleProviders, EMPTY, ReflectiveFactory, DefaultReflectiveFactory, Class
} from '@tsdi/ioc';
import { lastValueFrom, Subscription } from 'rxjs';
import { ApplicationEventMulticaster, ApplicationShutdownEvent, ApplicationStartEvent } from '../events';
import { OnDispose, OnApplicationShutdown, ModuleLifecycleHooks, Hooks, OnApplicationStart } from '../lifecycle';
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
    private _typeRefl: Class;

    reflectiveFactory = new DefaultReflectiveFactory();
    runnableFactory: RunnableFactory = new DefaultRunnableFactory(this);

    lifecycle!: ModuleLifecycleHooks;

    constructor(moduleType: Class, parent: Injector, option: ModuleOption = EMPTY_OBJ) {
        super(undefined, parent, option?.scope as InjectorScope ?? moduleType.type as Type);
        const dedupStack: Type[] = [];
        this.isStatic = moduleType.annotation.static || option.isStatic;
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

    protected override initLifecycle(platform?: Platform): LifecycleHooks {
        const lifecycle = this.get(LifecycleHooksResolver, null)?.resolve(platform) ?? new DefaultModuleLifecycleHooks(platform);
        lifecycle.init(this);
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

    protected processInjectorType(platform: Platform, typeOrDef: Type | ModuleWithProviders, dedupStack: Type[], moduleRefl?: Class) {
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
export function createModuleRef<T>(module: Type<T> | Class<T> | ModuleWithProviders<T>, parent: Injector, option?: ModuleOption): ModuleRef<T> {
    if (isFunction(module)) return new DefaultModuleRef(refl.get<ModuleDef>(module), parent, option);
    if (isModuleProviders(module)) return new DefaultModuleRef(refl.get<ModuleDef>(module.module), parent, {
        ...option,
        providers: [...module.providers ?? EMPTY, ...option?.providers ?? EMPTY]
    });
    return new DefaultModuleRef(module, parent, option)
}


export class DefaultModuleLifecycleHooks extends DestroyLifecycleHooks implements ModuleLifecycleHooks, OnApplicationStart {
    private _disposes = new Set<OnDispose>();
    private _disposed = true;
    private _shutdowned = true;
    private _appEventSubs: Subscription[] = [];
    applicationStarted = false;
    eventMulticaster!: ApplicationEventMulticaster;

    constructor(platform?: Platform) {
        super(platform);
    }

    onApplicationStart(): void | Promise<void> {
        this.applicationStarted = true;
    }

    override init(injector: Injector): void {
        this.eventMulticaster = injector.get(ApplicationEventMulticaster);
        this.eventMulticaster.addListener(ApplicationStartEvent, () => this.onApplicationStart())
    }

    clear(): void {
        this._disposes.clear();
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
                        () => this.runDispose()
                    ]) : m.lifecycle.dispose();
                }));
        } else {
            await this.runShutdown();
            await this.runDispose();
        }
    }

    async runDispose(): Promise<void> {
        this._appEventSubs?.forEach(e => e && e.unsubscribe());
        this._appEventSubs = [];
        this._disposed = true;
        await Promise.all(Array.from(this._disposes.values()).map(s => s && s.onDispose()));
        this.eventMulticaster.clear();
    }

    async runShutdown(): Promise<void> {
        this._shutdowned = true;
        await lastValueFrom(this.eventMulticaster.emit(new ApplicationStartEvent(this)));
    }

    runDestroy(): any {
        if (this.destroyable) {
            super.runDestroy();
        }
    }

    register(target: any, token: Token): void {
        const { onDestroy, onDispose, onApplicationStart, onApplicationShutdown } = (target as Hooks);
        if (isFunction(onDestroy)) {
            this.regDestory(target);
        }
        if (isFunction(onDispose)) {
            this.regDispose(target);
        }


        if (isFunction(onApplicationStart)) {
            this.eventMulticaster.addListener(ApplicationStartEvent, () => target.onApplicationStart())
        }

        if (isFunction(onApplicationShutdown)) {
            this.eventMulticaster.addListener(ApplicationShutdownEvent, () => target.onApplicationStart())
        }

    }

    protected regDispose(hook: OnDispose): void {
        this._disposed = false;
        this._disposes.add(hook);
    }
}

export class ModuleLifecycleHooksResolver implements LifecycleHooksResolver {
    resolve(plaform?: Platform): LifecycleHooks {
        return new DefaultModuleLifecycleHooks(plaform)
    }
}