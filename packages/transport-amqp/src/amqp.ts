
import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TransportModule } from '@tsdi/transport';
import { AmqpClient } from './client/client';
import { AmqpServer, AmqpServerOpts } from './server/server';


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
        const providers: ProviderType[] = [{ provide: AmqpServerOpts, useValue: options }];
        return {
            module: AmqpModule,
            providers
        }
    }

}
