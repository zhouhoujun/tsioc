import { AbstractType, DefaultInvocationContext, ClassRef, ModuleDef, ModuleRef, Invocation, noPointcut, InjectUtil } from '@tsdi/ioc';
import { Logger, LoggerManagers } from '@tsdi/logger';
import { ApplicationArguments } from '../ApplicationArguments';
import { ApplicationEvent } from '../ApplicationEvent';
import { ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { ApplicationRunners } from '../ApplicationRunners';
import { ApplicationContext, ApplicationContextFactory, BootstrapOption, EnvironmentOption, PROCESS_ROOT } from '../ApplicationContext';
import { ApplicationContextRefreshEvent } from '../events';





/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class DefaultApplicationContext<T = any> extends DefaultInvocationContext<ModuleRef> implements ApplicationContext<T> {

    private _multicaster: ApplicationEventMulticaster;
    exit = true;
    // protected isStatic = false;
    private _runners: ApplicationRunners;

    constructor(parent: ModuleRef, options: EnvironmentOption = {}) {
        super(parent, options);
        this._multicaster = parent.get(ApplicationEventMulticaster);
        InjectUtil.setValue(this.getParent(), ApplicationContext, this);
        this._runners = parent.get(ApplicationRunners);
        this.onDestroy(this._runners);
        if (options.eventsOptions) {
            this.eventMulticaster.use(options.eventsOptions);
        }
        if (options.runnersOptions) {
            this.runners.use(options.runnersOptions);
        }
    }

    getArguments() {
        return this.get(ApplicationArguments);
    }


    get baseURL(): string {
        return this.get(PROCESS_ROOT)
    }

    get instance() {
        return this.getParent().instance
    }

    get runners() {
        return this._runners
    }

    get eventMulticaster(): ApplicationEventMulticaster {
        return this._multicaster;
    }

    async bootstrap<C>(type: AbstractType<C> | ClassRef<C>, option?: BootstrapOption): Promise<Invocation<C>> {
        const typeRef = this.runners.attach(type, { ...option });
        if (typeRef) {
            await this.runners.run(typeRef.type);
        }
        return typeRef;
    }

    getLogger(name?: string, adapter?: string | AbstractType): Logger {
        return this.get(LoggerManagers, null)?.getLogger(name, adapter) ?? null!;
    }

    publishEvent(event: ApplicationEvent): Promise<void>;
    publishEvent(event: Object): Promise<void>;
    async publishEvent(obj: ApplicationEvent | Object): Promise<void> {
       await this.eventMulticaster.publishEvent(obj);
    }

    /**
     * refresh context.
     */
    async refresh(): Promise<void> {
        this._multicaster.emit(new ApplicationContextRefreshEvent(this))
    }

    close(): Promise<void> {
        return this.destroy();
    }

    async destroy(): Promise<void> {
        await this.runners.stop();
        super.destroy();
    }

}

/**
 * default application factory.
 */
export class DefaultApplicationContextFactory extends ApplicationContextFactory {
    /**
     * none poincut for aop.
     */
    static [noPointcut] = true;

    create<T>(root: ModuleRef<T>, option?: EnvironmentOption): ApplicationContext<T> {
        const ann = root.moduleReflect.getAnnotation<ModuleDef>();
        if (ann?.baseURL) {
            InjectUtil.setValue(root, PROCESS_ROOT, ann.baseURL)
        }
        if (!option) {
            option = {};
        }
        if (!option.args) {
            option.args = root.get(ApplicationArguments, null);
        }
        const ctx = this.createInstance(root, option);
        return ctx
    }

    protected createInstance(inj: ModuleRef, option?: EnvironmentOption) {
        return new DefaultApplicationContext(inj, option)
    }
}

