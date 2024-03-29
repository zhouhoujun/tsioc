import { Injectable, ProviderType, ReflectiveRef, Type, tokenId } from '@tsdi/ioc';
import { ApplicationContext, Startup } from '@tsdi/core';


export interface RegisterService {
    service: Type<any>;
    bootstrap?: boolean;
    microservice?: boolean;
    providers: ProviderType[]
}

export const REGISTER_SERVICES = tokenId<RegisterService[]>('REGISTER_SERVICES');




/**
 * setup register services in root.
 */
@Injectable()
export class SetupServices {

    private context!: ApplicationContext;

    private services: ReflectiveRef[] = [];
    private unboots = new Set<Type>();

    @Startup()
    protected async setup(context: ApplicationContext): Promise<any> {
        this.context = context;

        const services = context.injector.get(REGISTER_SERVICES);

        services.forEach(s => {

            if (s.bootstrap === false) {
                this.unboots.add(s.service);
            }
            this.services.push(context.runners.attach(s.service, { limit: 1, bootstrap: s.bootstrap, providers: s.providers }));
        })

    }

    getServices(): ReflectiveRef[] {
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