import { TransformModule } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { ModbusClient } from './client/client';
import { ModbusServer } from './server/server';
import { RouterModule } from '@tsdi/transport';


@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        ModbusClient,
        ModbusServer
    ]
})
export class ModbusModule {

}
