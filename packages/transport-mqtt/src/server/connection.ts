import { EMPTY_OBJ } from '@tsdi/ioc';
import { ConnectionOpts, ev, ServerConnection } from '@tsdi/transport';
import { Duplex } from 'stream';
import {
    IConnectPacket, IConnackPacket, IPublishPacket, IPubackPacket, IPubrecPacket,
    IPubrelPacket, IPubcompPacket, ISubscribePacket, ISubackPacket, IUnsubscribePacket,
    IUnsubackPacket, IPingreqPacket, IPingrespPacket, IDisconnectPacket, IAuthPacket
} from 'mqtt-packet';
import { MqttProtocol } from '../protocol';


export class MqttConnection extends ServerConnection {

    constructor(stream: Duplex, transport: MqttProtocol, opts: ConnectionOpts = EMPTY_OBJ) {
        super(stream, transport, opts);
        if (opts.noData !== true) {
            this.once(ev.DATA, (connPacket) => {
                this.setOptions(connPacket, opts);
                this.on(ev.DATA, (packet) => this.emit(packet.cmd, packet));
                this.emit(ev.DATA, connPacket);
            })
        }
    }

    connect(opts: IConnectPacket, cb?: () => void) {
        this.writeCmd('connect', opts, cb)
    }

    connack(opts: IConnackPacket, cb?: () => void) {
        this.writeCmd('connack', opts, cb)
    }

    publish(opts: IPublishPacket, cb?: () => void) {
        this.writeCmd('publish', opts, cb)
    }

    puback(opts: IPubackPacket, cb?: () => void) {
        this.writeCmd('puback', opts, cb)
    }

    pubrec(opts: IPubrecPacket, cb?: () => void) {
        this.writeCmd('pubrec', opts, cb)
    }

    pubrel(opts: IPubrelPacket, cb?: () => void) {
        this.writeCmd('pubrel', opts, cb)
    }
    pubcomp(opts: IPubcompPacket, cb?: () => void) {
        this.writeCmd('pubcomp', opts, cb)
    }
    subscribe(opts: ISubscribePacket, cb?: () => void) {
        this.writeCmd('subscribe', opts, cb)
    }
    suback(opts: ISubackPacket, cb?: () => void) {
        this.writeCmd('suback', opts, cb)
    }
    unsubscribe(opts: IUnsubscribePacket, cb?: () => void) {
        this.writeCmd('unsubscribe', opts, cb)
    }
    unsuback(opts: IUnsubackPacket, cb?: () => void) {
        this.writeCmd('unsuback', opts, cb)
    }
    pingreq(opts: IPingreqPacket, cb?: () => void) {
        this.writeCmd('pingreq', opts, cb)
    }
    pingresp(opts: IPingrespPacket, cb?: () => void) {
        this.writeCmd('pingresp', opts, cb)
    }
    disconnect(opts: IDisconnectPacket, cb?: () => void) {
        this.writeCmd('disconnect', opts, cb)
    }
    auth(opts: IAuthPacket, cb?: () => void) {
        this.writeCmd('auth', opts, cb)
    }


    private writeCmd(cmd: string, opts: any, cb?: () => void) {
        this.write({ ...opts, cmd });
        if (cb) setImmediate(cb);
    }
} 
