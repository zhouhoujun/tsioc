import { Injectable, Provider, Invocation, AbstractType, token, isFunction } from '@tsdi/ioc';
import { ApplicationContext, Startup } from '@tsdi/core';
import { MicroServiceServer } from './MicroService';


export interface RegisterMicroService {
    service: AbstractType | Invocation;
    bootstrap?: boolean;
    microservice?: boolean;
    providers?: Provider[];
}

export const REGISTER_MICRO_SERVICES = token<RegisterMicroService[]>('REGISTER_MICRO_SERVICES');


/**
 * Setup and register microservices in root, with registration and health lifecycle.
 * 在根容器中设置和注册微服务，包含注册和健康检查生命周期
 */
@Injectable()
export class SetupMicroServices {

    private context!: ApplicationContext;

    private services: Invocation<MicroServiceServer>[] = [];
    private unboots = new Set<AbstractType>();

    @Startup()
    protected async setup(context: ApplicationContext): Promise<any> {
        this.context = context;

        const services = context.get(REGISTER_MICRO_SERVICES);

        services.forEach(s => {
            if (s.bootstrap === false) {
                this.unboots.add(isFunction(s.service) ? s.service : s.service.type);
            }
            this.services.push(context.runners.attach(s.service, { limit: 1, bootstrap: s.bootstrap, providers: s.providers }));
        });
    }

    getServices(): Invocation<MicroServiceServer>[] {
        return this.services;
    }

    /**
     * Run services configured not to auto-bootstrap.
     * 运行配置为不自动启动的服务
     */
    async run(): Promise<void> {
        if (!this.unboots.size) return;
        await this.context.runners.run(Array.from(this.unboots.values()));
    }
}
