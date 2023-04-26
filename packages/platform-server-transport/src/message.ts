import { ClientStream, ClientStreamFactory, OutgoingHeaders, ReqHeaders, Socket } from '@tsdi/core';
import { Execption, Injectable } from '@tsdi/ioc';
import { Writable, Readable, Duplex } from 'stream';
import { NumberAllocator } from 'number-allocator';

@Injectable()
export class ClientStreamFactoryImpl<TSocket extends Duplex = any> implements ClientStreamFactory<TSocket> {

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

export class ClientStreamImpl<TSocket extends Duplex = any> extends Duplex implements ClientStream<TSocket> {

    constructor(readonly id: number, readonly socket: TSocket, readonly headers: OutgoingHeaders, private delimiter: string = '\n') {
        super({
            read(this: ClientStreamImpl, size: number) {
                this.socket.read(size)
            },
            write(this: ClientStreamImpl, chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
                if(!this.headerSent){
                    this._write(JSON.stringify(this.headers), encoding, callback);
                    this._headerSent = true;
                }
                this._write(chunk, encoding, callback)
            }
        })
    }

    private _headerSent = false;
    get headerSent(): boolean {
        return this._headerSent;
    }

    
    // end(cb?: (() => void) | undefined): this;
    // end(data: Buffer, cb?: (() => void) | undefined): this;
    // end(str: string, encoding?: BufferEncoding | undefined, cb?: (() => void) | undefined): this;
    // end(str?: any, encoding?: any, cb?: any): this {
    //     if(!this.headerSent) {
    //         this.write(JSON.stringify(this.headers))
    //     }
    //     this.write(this.delimiter);
    //     return this;
    // }

}


