
import { RouterModule, TransformModule } from '@tsdi/core';
import { Module, ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TransportModule } from '@tsdi/transport';
import { AmqpClient } from './client/client';
import { AmqpServer } from './server/server';
import { AMQP_SERV_OPTS, AmqpServerOpts } from './server/options';


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        AmqpClient,
        AmqpServer
    ]
})
export class AmqpModule {
    /**
     * Amqp Server options.
     * @param options 
     * @returns 
     */
    static withOptions(options: AmqpServerOpts): ModuleWithProviders<AmqpModule> {
        const providers: ProviderType[] = [{ provide: AMQP_SERV_OPTS, useValue: options }];
        return {
            module: AmqpModule,
            providers
        }
    }

}
