import { AssetContext, ListenOpts, ListenService, Outgoing, Server } from '@tsdi/core';
import { Inject, Injectable, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { MqttClient, connect } from 'mqtt';
import { MQTT_SERV_OPTS, MqttServerOpts } from './options';
import { MqttEndpoint } from './endpoint';



@Injectable()
export class MqttServer extends Server<AssetContext, Outgoing> {
    
    @InjectLog()
    private logger?: Logger;

    constructor(readonly endpoint: MqttEndpoint, @Inject(MQTT_SERV_OPTS, { nullable: true }) private options: MqttServerOpts) {
        super();
    }

    private mqtt?: MqttClient;
    protected override async onStartup(): Promise<any> {

    }

    protected override async onStart(): Promise<any> {
        this.mqtt = connect(this.options.serverOpts);
    }

    protected override async onShutdown(): Promise<any> {
        if (!this.mqtt || this.mqtt.disconnected) return;
        await promisify<void, boolean | undefined, Object | undefined>(this.mqtt.end, this.mqtt)(true, undefined)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
    }


    // protected createServer(opts: MqttServerOpts): net.Server | tls.Server | ws.Server<ws.WebSocket> {
    //     const servOpts = opts.serverOpts;
    //     if (!opts.listenOpts) throw new ArgumentExecption('not config listenOpts');
    //     switch (servOpts.protocol) {
    //         case 'mqtt':
    //         case 'tcp':
    //             if (!opts.listenOpts.port) {
    //                 opts.listenOpts.port = 1883;
    //             }
    //             return new net.Server(servOpts.options);
    //         case 'mqtts':
    //         case 'tls':
    //             if (!servOpts.options.key || !servOpts.options.cert) {
    //                 throw new Execption('Missing secure protocol key')
    //             }
    //             if (!opts.listenOpts.port) {
    //                 opts.listenOpts.port = 8883;
    //             }
    //             return new tls.Server(servOpts.options);
    //         case 'ws':
    //         case 'wss':
    //             if (!opts.listenOpts.port) {
    //                 opts.listenOpts.port = servOpts.protocol == 'ws' ? 80 : 443;
    //             }
    //             return new ws.Server(servOpts.options);
    //         default:
    //             throw new Execption('Unknown protocol for secure connection: "' + (servOpts as any).protocol + '"!')
    //     }
    // }

    // protected override parseToDuplex(conn: ws.WebSocket, ...args: any[]): Duplex {
    //     return ws.createWebSocketStream(conn, { objectMode: true });
    // }

    // protected override createConnection(duplex: Duplex, transport: StreamTransportStrategy, opts?: ConnectionOpts | undefined): ServerConnection {
    //     return new MqttConnection(duplex, transport, opts);
    // }

    // protected onConnection(server: net.Server | tls.Server | ws.Server<ws.WebSocket> | Duplex, opts?: ConnectionOpts | undefined): Observable<Connection> {
    //     const packetor = this.context.get(MqttPacketFactory);
    //     return new Observable((observer) => {
    //         const onError = (err: Error) => {
    //             observer.error(err);
    //         };
    //         const onConnection = (socket: Duplex | ws.WebSocket) => {
    //             if (socket instanceof ws.WebSocket) {
    //                 socket = ws.createWebSocketStream(socket, { objectMode: true });
    //             }
    //             observer.next(new MqttConnection(socket, packetor, opts));
    //         }
    //         const onClose = () => {
    //             observer.complete();
    //         }
    //         server.on(ev.ERROR, onError);
    //         server.on(ev.CONNECTION, onConnection);
    //         server.on(ev.CLOSE, onClose)

    //         return () => {
    //             server.off(ev.ERROR, onError);
    //             server.off(ev.CLOSE, onClose);
    //             server.off(ev.CONNECTION, onConnection);
    //         }
    //     })
    // }

    // protected createConnection(socket: net.Socket | tls.TLSSocket | ws.WebSocket, opts?: ConnectionOpts | undefined): Connection {
    //     const packet = this.context.get(MqttPacketFactory);
    //     return new MqttConnection(socket, packet, opts);
    // }
    // protected createContext(req: IncomingMessage, res: OutgoingMessage): TransportContext<IncomingMessage, OutgoingMessage> {
    //     const injector = this.context.injector;
    //     return new TransportContext(injector, req, res, this, injector.get(MqttVaildator))
    // }


    // protected listen(opts: ListenOpts): Promise<void> {
    //     const defer = lang.defer<void>();
    //     if (this.server instanceof ws.Server) {
    //         const sropts = this.getOptions().serverOpts as ws.ServerOptions;
    //         if (sropts.server) {
    //             if (!sropts.server.listening) {
    //                 // sropts.server.once(ev.LISTENING, defer.resolve);
    //                 sropts.server.listen(opts, defer.resolve);
    //             } else {
    //                 defer.resolve();
    //             }
    //         } else {
    //             // server
    //             defer.resolve();
    //         }
    //     } else {
    //         this.server.listen(opts, defer.resolve);
    //     }
    //     return defer.promise;
    // }
}
