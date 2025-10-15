import { Injectable, Provider, Invocation, AbstractType, tokenId } from '@tsdi/ioc';
import { ApplicationContext, Startup } from '@tsdi/core';
import { Server } from './Server';


export interface RegisterService {
    service: AbstractType<any>;
    bootstrap?: boolean;
    microservice?: boolean;
    providers: Provider[]
}

export const REGISTER_SERVICES = tokenId<RegisterService[]>('REGISTER_SERVICES');




/**
 * setup register services in root.
 */
@Injectable()
export class SetupServices {

    private context!: ApplicationContext;

    private services: Invocation<Server>[] = [];
    private unboots = new Set<AbstractType>();

    @Startup()
    protected async setup(context: ApplicationContext): Promise<any> {
        this.context = context;

        const services = context.get(REGISTER_SERVICES);

        services.forEach(s => {

            if (s.bootstrap === false) {
                this.unboots.add(s.service);
            }
            this.services.push(context.runners.attach(s.service, { limit: 1, bootstrap: s.bootstrap, providers: s.providers }));
        })

    }

    getServices(): Invocation<Server>[] {
        return this.services;
    }

    /**
     * run services, configed not auto bootstrap.
     * @returns 
     */
    async run(): Promise<void> {
        if (!this.unboots.size) return;
        await this.context.runners.run(Array.from(this.unboots.values()));
    }

}