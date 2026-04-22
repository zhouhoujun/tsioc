import { Module, Injectable, Injector, ModuleType, Provider, toProviders } from '@tsdi/ioc';
import { Binder, BinderConfig, BinderFactory, BinderTypeRegistry, Serializer, Deserializer, JsonSerializer, JsonDeserializer } from './binder';
import { BinderRegistry, BINDER_REGISTRY, provideBinder } from './binder.registry';


export const BINDERS = 'BINDERS';

@Injectable()
export class BinderFactoryImpl implements BinderFactory {
    constructor(private registry: BinderRegistry) {}
    
    create(config: BinderConfig): Binder {
        return this.registry.getFromConfig(config);
    }
}

export interface BinderModuleOptions {
    binders?: BinderTypeRegistry[];
    configs?: Record<string, BinderConfig>;
    serializer?: Serializer;
    deserializer?: Deserializer;
}

@Module({
    providers: [
        BinderRegistry,
        BinderFactoryImpl,
        { provide: BinderFactory, useClass: BinderFactoryImpl },
        { provide: Serializer, useClass: JsonSerializer },
        { provide: Deserializer, useClass: JsonDeserializer }
    ]
})
export class BinderModule {

    static forRoot(options: BinderModuleOptions = {}): ModuleType {
        const providers: Provider[] = [];
        
        if (options.serializer) {
            providers.push({ provide: Serializer, useValue: options.serializer });
        }
        if (options.deserializer) {
            providers.push({ provide: Deserializer, useValue: options.deserializer });
        }
        
        if (options.binders) {
            providers.push(...options.binders.map(b => ({
                provide: BINDERS,
                useValue: b,
                multi: true
            })));
        }
        
        if (options.configs) {
            const registry = { provide: BINDER_REGISTRY, useFactory: (r: BinderRegistry) => {
                Object.entries(options.configs!).forEach(([name, config]) => r.registerConfig(name, config));
                return r;
            }, deps: [BinderRegistry] };
            providers.push(registry);
        }

        return {
            module: BinderModule,
            providers
        };
    }

    static withBinder(binder: BinderTypeRegistry): ModuleType {
        return this.forRoot({ binders: [binder] });
    }

    static withBinders(binders: BinderTypeRegistry[]): ModuleType {
        return this.forRoot({ binders });
    }

    static withConfig(name: string, config: BinderConfig): ModuleType {
        return this.forRoot({ configs: { [name]: config } });
    }

    static withConfigs(configs: Record<string, BinderConfig>): ModuleType {
        return this.forRoot({ configs });
    }
}

export function registerBinder(binder: BinderTypeRegistry): Provider {
    return { provide: BINDERS, useValue: binder, multi: true };
}

export function registerBinderConfig(name: string, config: BinderConfig): Provider {
    return { 
        provide: BINDER_REGISTRY, 
        useFactory: (r: BinderRegistry) => {
            r.registerConfig(name, config);
            return r;
        },
        deps: [BinderRegistry]
    };
}