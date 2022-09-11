import { EMPTY_OBJ } from '@tsdi/ioc';
import { ConnectionOpts, ev, ServerConnection } from '@tsdi/transport';
import { Duplex } from 'stream';
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

    connect(opts: any, cb?: () => void) {
        this.writeCmd('connect', opts, cb)
    }

    connack(opts: any, cb?: () => void) {
        this.writeCmd('connack', opts, cb)
    }

    publish(opts: any, cb?: () => void) {
        this.writeCmd('publish', opts, cb)
    }

    puback(opts: any, cb?: () => void) {
        this.writeCmd('puback', opts, cb)
    }

    pubrec(opts: any, cb?: () => void) {
        this.writeCmd('pubrec', opts, cb)
    }

    pubrel(opts: any, cb?: () => void) {
        this.writeCmd('pubrel', opts, cb)
    }
    pubcomp(opts: any, cb?: () => void) {
        this.writeCmd('pubcomp', opts, cb)
    }
    subscribe(opts: any, cb?: () => void) {
        this.writeCmd('subscribe', opts, cb)
    }
    suback(opts: any, cb?: () => void) {
        this.writeCmd('suback', opts, cb)
    }
    unsubscribe(opts: any, cb?: () => void) {
        this.writeCmd('unsubscribe', opts, cb)
    }
    unsuback(opts: any, cb?: () => void) {
        this.writeCmd('unsuback', opts, cb)
    }
    pingreq(opts: any, cb?: () => void) {
        this.writeCmd('pingreq', opts, cb)
    }
    pingresp(opts: any, cb?: () => void) {
        this.writeCmd('pingresp', opts, cb)
    }
    disconnect(opts: any, cb?: () => void) {
        this.writeCmd('disconnect', opts, cb)
    }
    auth(opts: any, cb?: () => void) {
        this.writeCmd('auth', opts, cb)
    }


    private writeCmd(cmd: string, opts: any, cb?: () => void) {
        this.write({ ...opts, cmd });
        if (cb) setImmediate(cb);
    }
} 
