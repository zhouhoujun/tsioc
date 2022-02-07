import { Token, Type, isFunction, ModuleMetadata, DefaultInvocationContext, EMPTY_OBJ, InvokeArguments } from '@tsdi/ioc';
import { ConfigureLoggerManager, LoggerManager, LOGGER_MANAGER } from '@tsdi/logs';
import { Observable } from 'rxjs';
import { CONFIGURATION, PROCESS_ROOT } from './metadata/tk';
import { ApplicationConfiguration, ConfigureManager } from './configure/config';
import { Pattern, WritePacket } from './transport/packet';
import { ClientFactory } from './transport/client/factory';
import { ApplicationContext, ApplicationFactory, ApplicationOption, BootstrapOption } from './context';
import { RunnableFactory, RunnableFactoryResolver, RunnableSet, RunnableRef } from './runnable';
import { ModuleRef } from './module.ref';
import { ApplicationArguments } from './args';
import { ServerSet } from './server';
import { Client, ClientSet } from './client';
import { ServiceSet } from './service';




/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class DefaultApplicationContext extends DefaultInvocationContext implements ApplicationContext {

    readonly bootstraps: RunnableRef[] = [];
    readonly startups: Token[] = [];

    exit = true;

    constructor(readonly injector: ModuleRef, options: InvokeArguments = EMPTY_OBJ) {
        super(injector, options);
        injector.setValue(ApplicationContext, this);
    }

    get args() {
        return this.injector.get(ApplicationArguments)
    }

    get services() {
        return this.injector.get(ServiceSet);
    }

    get runnables() {
        return this.injector.get(RunnableSet);
    }

    get servers() {
        return this.injector.get(ServerSet);
    }

    get clients() {
        return this.injector.get(ClientSet);
    }

    bootstrap<C>(type: Type<C> | RunnableFactory<C>, opts?: BootstrapOption): any {
        const factory = isFunction(type) ? this.injector.resolve({ token: RunnableFactoryResolver, target: type }).resolve(type) : type;
        return factory.create(this.injector, opts, this).run();
    }

    get instance() {
        return this.injector.instance;
    }

    private client: Client | undefined;
    /**
     * send message.
     * @param pattern message pattern.
     * @param data send data.
     */
    send<TResult = WritePacket, TInput = any>(pattern: Pattern, data: TInput): Observable<TResult> {
        if (!this.client) {
            this.client = this.injector.get(ClientFactory).create({
                protocol: 'msg'
            });
        }
        return this.client.send(pattern, data);
    }

    /**
     * get log manager.
     */
    getLogManager(): LoggerManager {
        let logmgr = this.injector.get(LOGGER_MANAGER);
        if (!logmgr) {
            logmgr = this.injector.get(ConfigureLoggerManager);
            this.injector.setSingleton(LOGGER_MANAGER, logmgr);
        }
        return logmgr;
    }

    get baseURL(): string {
        return this.injector.get(PROCESS_ROOT);
    }

    getAnnoation<TM extends ModuleMetadata>(): TM {
        return this.injector.moduleReflect?.annotation as TM;
    }

    /**
     * configuration merge metadata config and all application config.
     */
    getConfiguration(): ApplicationConfiguration {
        return this.injector.get(CONFIGURATION);
    }

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager}
     */
    getConfigureManager(): ConfigureManager {
        return this.injector.get(ConfigureManager);
    }

}

/**
 * default application factory.
 */
export class DefaultApplicationFactory extends ApplicationFactory {

    create<T>(root: ModuleRef<T>, option?: ApplicationOption<T>): ApplicationContext {
        if (root.moduleReflect.annotation?.baseURL) {
            root.setValue(PROCESS_ROOT, root.moduleReflect.annotation.baseURL);
        }
        const ctx = this.createInstance(root, option);
        this.initOption(ctx, option);
        return ctx;
    }

    initOption<T>(ctx: ApplicationContext, option?: ApplicationOption<T>) {
        if (!option) return;

        const mgr = ctx.getConfigureManager();
        if (option.configures && option.configures.length) {
            option.configures.forEach(cfg => {
                mgr.useConfiguration(cfg);
            });
        } else {
            // load default config.
            mgr.useConfiguration();
        }
    }

    protected createInstance(inj: ModuleRef, option?: InvokeArguments) {
        return new DefaultApplicationContext(inj, option);
    }
}

