import { MicroService } from '@tsdi/core';
import { Injectable, Token } from '@tsdi/ioc';
import { NatsContext } from './context';
import { NatsEndpoint } from './endpoint';


@Injectable()
export class NatsServer extends MicroService<NatsContext> {
    
    constructor(
        readonly endpoint: NatsEndpoint
    ) {
        super()
    }
    
    protected onStartup(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    protected onStart(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    protected onShutdown(): Promise<any> {
        throw new Error('Method not implemented.');
    }

    
}
