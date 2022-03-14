import { Injectable } from '@tsdi/ioc';
import { TransportEndpoint } from '../endpoint';
import { TransportRequest, TransportResponse } from '../packet';
import { TransportServer } from '../server';


@Injectable()
export class WSServer extends TransportServer {

    get handler(): TransportEndpoint<TransportRequest, TransportResponse> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
}
