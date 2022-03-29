import { Injectable, InvocationContext } from '@tsdi/ioc';
import { RequestMethod, TransportRequest } from '../packet';
import { TransportClient } from '../client';
import { TransportContext } from '../context';
import { Endpoint } from '../endpoint';
import { ServerOption } from '../server';

@Injectable()
export class WSClient extends TransportClient {
    get endpoint(): Endpoint<TransportContext<ServerOption>> {
        throw new Error('Method not implemented.');
    }

    protected createContext(pattern: string | TransportRequest<any>, options?: { body?: any; method?: RequestMethod | undefined; headers?: any; context?: InvocationContext<any> | undefined; params?: any; observe?: 'body' | 'events' | 'response' | undefined; reportProgress?: boolean | undefined; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | undefined; withCredentials?: boolean | undefined; }): TransportContext<ServerOption> {
        throw new Error('Method not implemented.');
    }

    connect(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    
}
