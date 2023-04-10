
import { Duplex, DuplexOptions } from 'stream';
import { Socket, RemoteInfo } from 'dgram';
import { ev } from '@tsdi/transport';

export interface UdpStreamOption extends DuplexOptions {
    /**
     * packet delimiter code.
     */
    delimiter: string;
}

/**
 * parse upd socket to duplex stream.
 * @param socket 
 * @param opts 
 * @returns 
 */
export function parseToDuplex(socket: Socket, rinfo?: RemoteInfo, opts?: DuplexOptions): Duplex {
    return new UdpDuplex(socket, rinfo, { delimiter: '\r\n', ...opts });
}

export class UdpDuplex extends Duplex {
    private delimiter: Buffer;
    constructor(readonly socket: Socket, readonly rinfo: RemoteInfo | undefined, opts: UdpStreamOption) {
        super(opts);
        this.delimiter = Buffer.from(opts.delimiter);
        socket.on(ev.CLOSE, this.emit.bind(this, ev.CLOSE));
        socket.on(ev.ERROR, this.emit.bind(this, ev.ERROR));
        socket.on(ev.CONNECT, this.emit.bind(this, ev.CONNECT));
        socket.on(ev.END, this.emit.bind(this, ev.END));
        socket.on(ev.MESSAGE, (msg, rinfo) => {
            this.push(msg);
            this.push(this.delimiter)
        });
    }

    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        const address = this.rinfo ?? this.socket.remoteAddress();
        this.socket.send(chunk, address.port, address.address, callback)
    }

}
