import { Protocol, TransportRequest, TransportHandler, TransportServer, TransportResponse } from '@tsdi/core';

export class NATSServer extends TransportServer {
    get protocol(): Protocol {
        throw new Error('Method not implemented.');
    }
    get handler(): TransportHandler<TransportRequest<any>, TransportResponse<any>> {
        throw new Error('Method not implemented.');
    }
    
    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
}
