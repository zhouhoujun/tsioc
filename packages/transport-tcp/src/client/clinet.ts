import { Client, Connection, ConnectionFactory, Shutdown, TransportEvent, TransportRequest } from '@tsdi/core';
import { Injectable, lang, Nullable, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { Observable, defer, of } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TcpClientOpts } from './options';
import { TcpGuardHandler } from './handler';


/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable({ static: false })
export class TcpClient extends Client<TransportRequest, TransportEvent> {

    @InjectLog()
    private logger!: Logger;

    private options: TcpClientOpts;
    constructor(readonly handler: TcpGuardHandler, private connFac: ConnectionFactory, @Nullable() options: TcpClientOpts) {
        super();
        this.options = { ...options }
    }

    private connection!: Connection<tls.TLSSocket | net.Socket>;
    private $conn?: Observable<Connection<tls.TLSSocket | net.Socket>> | null;
    protected connect(): Observable<Connection<tls.TLSSocket | net.Socket>> {
        if (this.connection && this.isValid(this.connection)) {
            return of(this.connection)
        }
        if (this.$conn) return this.$conn;
        return this.$conn = defer(async () => {
            const conn = await this.connFac.create<tls.TLSSocket | net.Socket>(this.options);
            this.$conn = null;
            return conn;
        })
    }


    protected override async onShutdown(): Promise<void> {
        await promisify<void, Error>(this.connection.destroy, this.connection)(null!)
            .catch(err=> {
                this.logger?.error(err);
                return err;
            });
    }

    protected isValid(connection: Connection<tls.TLSSocket | net.Socket>): boolean {
        return !connection.destroyed
    }

    // protected override createConnection(opts: TcpClientOpts): Connection<tls.TLSSocket | net.Socket> {
    //     const socket = (opts.connectOpts as tls.ConnectionOptions).cert ? tls.connect(opts.connectOpts as tls.ConnectionOptions) : net.connect(opts.connectOpts as net.NetConnectOpts);
    //     const packet = this.handler.injector.get(TcpPackFactory);
    //     const conn = new DuplexConnection(socket, packet, { events: [ev.CONNECT], ...opts.connectionOpts });
    //     if (opts?.keepalive) {
    //         conn.setKeepAlive(true, opts.keepalive);
    //     }
    //     return conn
    // }

}

