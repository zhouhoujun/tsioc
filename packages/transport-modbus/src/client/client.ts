import { EndpointBackend, RequstOption, TransportClient } from '@tsdi/core';
import { Injectable, Token } from '@tsdi/ioc';

@Injectable()
export class ModbusClient extends TransportClient {
    protected buildRequest(url: any, options?: RequstOption | undefined) {
        throw new Error('Method not implemented.');
    }
    protected connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<any, any> {
        throw new Error('Method not implemented.');
    }
    

}