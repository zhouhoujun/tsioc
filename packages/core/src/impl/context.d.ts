import { AbstractType, ContextInjector, ClassRef, ModuleRef, Invocation, noPointcut } from '@tsdi/ioc';
import { Logger } from '@tsdi/logger';
import { ApplicationArguments } from '../ApplicationArguments';
import { ApplicationEvent } from '../ApplicationEvent';
import { ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { ApplicationRunners } from '../ApplicationRunners';
import { ApplicationContext, ApplicationContextFactory, BootstrapOption, EnvironmentOption } from '../ApplicationContext';
export declare class DefaultApplicationContext<T = any> extends ContextInjector<ModuleRef> implements ApplicationContext<T> {
    private _multicaster;
    private _applicationArgs;
    exit: boolean;
    readonly isStatic = false;
    private _runners;
    constructor(parent: ModuleRef, options?: EnvironmentOption);
    getArguments(): ApplicationArguments;
    get baseURL(): string;
    get instance(): any;
    get runners(): ApplicationRunners;
    get eventMulticaster(): ApplicationEventMulticaster;
    bootstrap<C>(type: AbstractType<C> | ClassRef<C>, option?: BootstrapOption): Promise<Invocation<C>>;
    getLogger(name?: string, adapter?: string | AbstractType): Logger;
    publishEvent(event: ApplicationEvent): Promise<void>;
    publishEvent(event: Object): Promise<void>;
    refresh(): Promise<void>;
    close(): Promise<void>;
    destroy(): Promise<void>;
}
export declare class DefaultApplicationContextFactory extends ApplicationContextFactory {
    static [noPointcut]: boolean;
    create<T>(root: ModuleRef<T>, option?: EnvironmentOption): ApplicationContext<T>;
    protected createInstance(inj: ModuleRef, option?: EnvironmentOption): DefaultApplicationContext<any>;
}
