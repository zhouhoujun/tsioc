import { EMPTY_OBJ } from '@tsdi/ioc';
import { ConnectionOpts, ev, DuplexConnection } from '@tsdi/transport';
import { Duplex } from 'stream';
import * as net from 'net';
import * as tls from 'tls';
import * as ws from 'ws';
import { IPacket } from 'mqtt-packet';
import {
    AuthOptions, ConnackOptions, ConnectOptions, DisconnectOptions, MqttPacketFactory,
    PingreqOptions, PingrespOptions, PubackOptions, PubcompOptions, PublishOptions, PubrecOptions,
    PubrelOptions, SubackOptions, SubscribeOptions, UnsubackOptions, UnsubscribeOptions
} from './transport';



export class MqttConnection extends DuplexConnection<net.Socket | tls.TLSSocket | ws.WebSocket> {

    constructor(socket: net.Socket | tls.TLSSocket | ws.WebSocket, packet: MqttPacketFactory, opts: ConnectionOpts = EMPTY_OBJ) {
        super(socket, packet, {
            parseToDuplex: (socket: ws.WebSocket) => ws.createWebSocketStream(socket),
            ...opts
        });
        if (opts.noData !== true) {
            this.once(ev.DATA, (connPacket) => {
                this.setOptions(connPacket, opts);
                this.on(ev.DATA, (packet) => this.emit(packet.cmd, packet));
                this.emit(ev.DATA, connPacket);
            })
        }
    }

    override setOptions(packet: IPacket, opts: ConnectionOpts) {
        const copts = this.opts = { ...packet, opts };
        if (copts.cmd === 'connack') {
            (copts as any).protocolVersion = opts.protocolVersion ?? 4;
        }
        this._parser.setOptions(copts);
        this._generator.setOptions(copts);
    }

    connect(opts: ConnectOptions, cb?: () => void) {
        this.writeCmd('connect', opts, cb)
    }

    connack(opts: ConnackOptions, cb?: () => void) {
        this.writeCmd('connack', opts, cb)
    }

    publish(opts: PublishOptions, cb?: () => void) {
        this.writeCmd('publish', opts, cb)
    }

    puback(opts: PubackOptions, cb?: () => void) {
        this.writeCmd('puback', opts, cb)
    }

    pubrec(opts: PubrecOptions, cb?: () => void) {
        this.writeCmd('pubrec', opts, cb)
    }

    pubrel(opts: PubrelOptions, cb?: () => void) {
        this.writeCmd('pubrel', opts, cb)
    }
    pubcomp(opts: PubcompOptions, cb?: () => void) {
        this.writeCmd('pubcomp', opts, cb)
    }
    subscribe(opts: SubscribeOptions, cb?: () => void) {
        this.writeCmd('subscribe', opts, cb)
    }
    suback(opts: SubackOptions, cb?: () => void) {
        this.writeCmd('suback', opts, cb)
    }
    unsubscribe(opts: UnsubscribeOptions, cb?: () => void) {
        this.writeCmd('unsubscribe', opts, cb)
    }
    unsuback(opts: UnsubackOptions, cb?: () => void) {
        this.writeCmd('unsuback', opts, cb)
    }
    pingreq(opts: PingreqOptions, cb?: () => void) {
        this.writeCmd('pingreq', opts, cb)
    }
    pingresp(opts: PingrespOptions, cb?: () => void) {
        this.writeCmd('pingresp', opts, cb)
    }
    disconnect(opts: DisconnectOptions, cb?: () => void) {
        this.writeCmd('disconnect', opts, cb)
    }
    auth(opts: AuthOptions, cb?: () => void) {
        this.writeCmd('auth', opts, cb)
    }

    private writeCmd(cmd: string, opts: any, cb?: () => void) {
        this.write({ ...opts, cmd });
        if (cb) setImmediate(cb);
    }
} 
