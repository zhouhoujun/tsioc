import { ClientStream, ClientStreamFactory, OutgoingHeaders, ReqHeaders, Socket } from '@tsdi/core';
import { Execption, Injectable } from '@tsdi/ioc';
import { Writable, Readable, Duplex } from 'stream';
import { NumberAllocator } from 'number-allocator';

@Injectable()
export class ClientStreamFactoryImpl<TSocket = any> implements ClientStreamFactory<TSocket> {

    allocator = new NumberAllocator(1, 65536);
    last?: number;
    create(socket: TSocket, headers: ReqHeaders): ClientStream<TSocket> {
        return new ClientStreamImpl(this.getStreamId(), socket, headers.headers);
    }

    getStreamId() {
        const id = this.allocator.alloc();
        if (!id) {
            throw new Execption('alloc stream id failed');
        }
        this.last = id;
        return id;
    }

}

export class ClientStreamImpl<TSocket> extends Duplex implements ClientStream<TSocket> {

    constructor(readonly id: number, readonly socket: TSocket, readonly headers: OutgoingHeaders) {
        super()
    }

}


