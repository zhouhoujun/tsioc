import { Injectable } from '@tsdi/ioc';
import { TransportHandler } from '../handler';
import { TransportRequest, TransportResponse } from '../packet';
import { TransportServer } from '../server';


@Injectable()
export class WSServer extends TransportServer {

    get handler(): TransportHandler<TransportRequest<any>, TransportResponse<any>> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
}
