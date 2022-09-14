import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders } from '@tsdi/ioc';
import { TransportModule } from '@tsdi/transport';
import { MqttClient } from './client/client';
import { MqttServer, MqttServerOpts } from './server/server';


@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        MqttClient,
        MqttServer
    ]
})
export class MqttModule {

    static withOptions(options: MqttServerOpts): ModuleWithProviders<MqttModule> {

        return {
            module: MqttModule,
            providers: [
                { provide: MqttServerOpts, useValue: options }
            ]
        }
    }

}
