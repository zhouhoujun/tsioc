import { TransportContext, TransportServer } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Subscription } from 'rxjs';

@Injectable()
export class MqttServer extends TransportServer<any, any> {
    start(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected createContext(request: any, response: any): TransportContext<any, any> {
        throw new Error('Method not implemented.');
    }
    protected bindEvent(ctx: TransportContext<any, any>, cancel: Subscription): void {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
}
