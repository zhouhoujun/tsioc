
import { Duplex, DuplexOptions } from 'stream';
import { Socket } from 'dgram';
import { ev } from './consts';



export function parseToDuplex(socket: Socket, opts?: DuplexOptions): Duplex {
    return new UdpSocket(socket, opts);
}

export class UdpSocket extends Duplex {
    constructor(readonly socket: Socket, opts?: DuplexOptions) {
        super(opts);

        socket.on(ev.CLOSE, this.emit.bind(this, ev.CLOSE));
        socket.on(ev.ERROR, this.emit.bind(this, ev.ERROR));
        socket.on(ev.CONNECT, this.emit.bind(this, ev.CONNECT));
        socket.on(ev.END, this.emit.bind(this, ev.END));
        socket.on(ev.MESSAGE, (msg, rinfo) => {
            this.push(msg);
        })
    }
    
    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        const address = this.socket.remoteAddress();
        this.socket.send(chunk, address.port, address.address, callback)
    }
}
