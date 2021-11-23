
import {
    DefaultInjector, Injector, InjectorScope, InjectorTypeWithProviders, refl, isFunction,
    Platform, ModuleReflect, Modules, processInjectorType, ProviderType, Token, Type, ClassType,
    OperationFactory, TypeReflect, DefaultOperationFactory, OperationFactoryResolver
} from '@tsdi/ioc';
import { ModuleFactory, ModuleFactoryResolver, ModuleOption } from '../module.factory';
import { ModuleRef } from '../module.ref';
import { RunnableFactoryResolver } from '../runnable';
import { ApplicationShutdownHandlers, Shutdown } from '../shutdown';
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
    shutdownHandlers = new DefaultApplicationShutdownHandlers();

    constructor(moduleType: ModuleReflect, providers: ProviderType[] | undefined, readonly parent: Injector,
        readonly scope?: InjectorScope, deps?: Modules[]) {
        super(undefined, parent, scope ?? moduleType.type as Type);
        const dedupStack: Type[] = [];
        this._typeRefl = moduleType;
        this._type = moduleType.type as Type;
        this.inject(
            { provide: ApplicationShutdownHandlers, useValue: this.shutdownHandlers },
            { provide: RunnableFactoryResolver, useValue: this.runnableFactoryResolver },
            { provide: OperationFactoryResolver, useValue: this.operationFactoryResolver }
        );
        if (scope === 'root') {
            this.parent?.setValue(ApplicationShutdownHandlers, this.shutdownHandlers);
        }
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


    async dispose(): Promise<void> {
        try {
            await this.shutdownHandlers.run();
        } catch (err) {
            throw err;
        } finally {
            super.destroy();
        }
    }


    override destroy() {
        if (this.destroyed) return;
        if (!this.shutdownHandlers.disposed) {
            return this.dispose();
        } else {
            super.destroy();
        }
    }

    protected override destroying() {
        this.platform()?.modules.delete(this);
        super.destroying();
        this._defs.clear();
        this._type = null!;
        this.shutdownHandlers.clear();
        this.shutdownHandlers = null!;
        this.operationFactoryResolver = null!;
        this.runnableFactoryResolver = null!;
        this._typeRefl = null!;
        this._instance = null!;
    }

}



export class DefaultApplicationShutdownHandlers extends ApplicationShutdownHandlers {

    private shutdowns: Shutdown[];
    private _disposed = false;
    constructor() {
        super()
        this.shutdowns = [];
    }

    get disposed(): boolean {
        return this.shutdowns.length === 0 || this._disposed;
    }

    async run(): Promise<void> {
        if (!this._disposed) {
            this._disposed = true;
            await Promise.all(this.shutdowns.map(s => s && s.run()));
            this.clear();
        }
    }

    has(shutdown: Shutdown | any): boolean {
        return this.shutdowns.some(i => i === shutdown || i.target === shutdown.target);
    }
    add(shutdown: Shutdown): void {
        if (this.shutdowns.some(i => i.target === shutdown.target)) return;
        this.shutdowns.unshift(shutdown);
    }
    clear(): void {
        this.shutdowns = [];
    }
    forEach(callback: (value: any) => void): void {
        this.shutdowns.forEach(callback);
    }
    remove(shutdown: Shutdown | any): void {
        let idx = this.shutdowns.findIndex(i => i === shutdown || i.target === shutdown.target);
        if (idx >= 0) this.shutdowns.splice(idx, 1);
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


export class ModuleOperationFactoryResolver extends OperationFactoryResolver {
    create<T>(type: ClassType<T> | TypeReflect<T>): OperationFactory<T> {
        return new DefaultOperationFactory(type);
    }
}