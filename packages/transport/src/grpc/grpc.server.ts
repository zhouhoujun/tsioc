import { TransportHandler, TransportRequest, TransportResponse, TransportServer } from '@tsdi/core';

export class GrpcServer extends TransportServer {
    
    constructor(readonly handler: TransportHandler) {
        super();
    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    onDispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
}
