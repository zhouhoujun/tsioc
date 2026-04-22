import { Injectable, Inject, Injector, Token, Singleton, ArgumentException, OnDestroy, token, ProvdierOf, Provider, toProvider } from "@tsdi/ioc";
import { Transport } from '@tsdi/common';
import { Binder, BinderConfig, BinderFactory, BinderTypeRegistry } from './binder';

/**
 * Binder registry token.
 */
export const BINDER_REGISTRY = token<BinderRegistry>('BINDER_REGISTRY');

/**
 * Binder registry - manages binder registration and lookup.
 * 
 * 参考 Spring Cloud Stream META-INF/spring.binders 注册机制
 */
@Singleton()
@Injectable()
export class BinderRegistry implements OnDestroy {

    private binders = new Map<Transport, BinderTypeRegistry>();
    private instances = new Map<string, Binder>();
    private configs = new Map<string, BinderConfig>();

    constructor(@Inject() private injector: Injector) { }

    /**
     * register binder type.
     */
    register(registry: BinderTypeRegistry): void {
        if (this.binders.has(registry.transport)) {
            throw new ArgumentException(`Binder for transport ${Transport[registry.transport]} already registered`);
        }
        this.binders.set(registry.transport, registry);
    }

    /**
     * register binder config.
     */
    registerConfig(name: string, config: BinderConfig): void {
        this.configs.set(name, config);
    }

    /**
     * get binder by transport type.
     */
    getBinder(transport: Transport): BinderTypeRegistry | undefined {
        return this.binders.get(transport);
    }

    /**
     * get binder instance by name.
     */
    get(name: string): Binder {
        const instance = this.instances.get(name);
        if (instance) return instance;

        const config = this.configs.get(name);
        if (!config) {
            throw new ArgumentException(`Binder config for name ${name} not found`);
        }

        return this.createBinder(config);
    }

    /**
     * get binder by config.
     */
    getFromConfig(config: BinderConfig): Binder {
        const name = config.binderName ?? config.name ?? `${Transport[config.transport]}_${config.microservice ? 'micro_' : ''}${config.name || 'default'}`;
        
        const existing = this.instances.get(name);
        if (existing) return existing;

        config.binderName = name;
        return this.createBinder(config);
    }

    /**
     * create binder instance from config.
     */
    private createBinder(config: BinderConfig): Binder {
        const registry = this.binders.get(config.transport);
        if (!registry) {
            throw new ArgumentException(`Binder for transport ${Transport[config.transport]} not registered`);
        }

        let binder: Binder;
        if (registry.factory) {
            const factory = this.injector.get(registry.factory);
            binder = factory.create(config);
        } else {
            binder = this.injector.get(registry.type);
            binder.config = config;
        }

        this.instances.set(config.binderName!, binder);
        this.configs.set(config.binderName!, config);
        return binder;
    }

    /**
     * list all registered binder types.
     */
    list(): BinderTypeRegistry[] {
        return Array.from(this.binders.values());
    }

    /**
     * check if transport is registered.
     */
    has(transport: Transport): boolean {
        return this.binders.has(transport);
    }

    /**
     * cleanup on destroy.
     */
    onDestroy(): void {
        this.instances.clear();
        this.configs.clear();
        this.binders.clear();
    }
}

/**
 * Binder module configuration.
 */
export interface BinderModuleConfig {
    /**
     * binders to register.
     */
    binders?:  ProvdierOf<BinderTypeRegistry>[];

    /**
     * binder configs.
     */
    configs?: Record<string, BinderConfig>;
}

/**
 * create binder providers.
 */
export function provideBinder(config: BinderModuleConfig): Provider[] {
    const providers: Provider[] = [];

    if (config.binders) {
        config.binders.forEach(b => {
            providers.push(toProvider(BINDER_REGISTRY, b, true));
        });
    }

    return providers;
}