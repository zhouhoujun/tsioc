import { Inject, Injectable, ModuleLoader, Type } from '@tsdi/ioc';
import { TransportClient, Deserializer, TransportRequest, TransportHandler, TransportResponse } from '@tsdi/core';
import { ModbusRTU } from './modbus.transform';

let modbusPackage: { default: Type<ModbusRTU> };

@Injectable({
    providers: [
        // {provide: Deserializer}
    ]
})
export class ModbusClient extends TransportClient {
    
    @Inject() protected loader!: ModuleLoader;

    protected client: ModbusRTU | undefined;

    constructor(handler: TransportHandler, private url: string, private options: SerialPortOptions) {
        super();
    }

    async connect(): Promise<void> {
        if (!modbusPackage) {
            modbusPackage = await this.loader.require('modbus-serial');
        }
        if (!this.client) {
            this.client = new modbusPackage.default();
        }
        this.client.connectRTUBuffered(this.url, this.options);

    }

    async close(): Promise<void> {
        await this.client?.close();
    }

    protected publish(packet: TransportRequest<any>, callback: (packet: TransportResponse<any>) => void): () => void {
        throw new Error('Method not implemented.');
    }
    protected dispatchEvent<T = any>(packet: TransportRequest<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }
}