import { Injectable } from '@tsdi/ioc';
import { TransportContext } from '../context';
import { Endpoint } from '../endpoint';
import { ServerOption, TransportServer } from '../server';


@Injectable()
export class WSServer extends TransportServer {
    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    get endpoint(): Endpoint<TransportContext<ServerOption>> {
        throw new Error('Method not implemented.');
    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
}
