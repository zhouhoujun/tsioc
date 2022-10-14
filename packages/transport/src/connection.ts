import { TransportExecption } from '@tsdi/core';
import { Abstract, EMPTY_OBJ, lang } from '@tsdi/ioc';
import { Writable, Duplex, Transform } from 'stream';
import { ev } from './consts';
import { Duplexify, DuplexifyOptions } from './duplexify';


/**
 * connection options.
 */
export interface ConnectionOpts extends DuplexifyOptions, Record<string, any> {
    noData?: boolean;
    noError?: number;
    /**
     * packet size limit.
     */
    maxSize?: number;
    /**
     * packet delimiter code.
     */
    delimiter?: string;
    /**
     * packet buffer encoding.
     */
    encoding?: BufferEncoding;
}

@Abstract()
export abstract class PacketParser extends Transform {
    abstract setOptions(opts: ConnectionOpts): void;
}

@Abstract()
export abstract class PacketGenerator extends Writable {
    abstract setOptions(opts: ConnectionOpts): void;
}

@Abstract()
export abstract class Packetor {
    /**
     * packet parser
     * @param opts options of type {@link ConnectionOpts}.
     */
    abstract parser(opts: ConnectionOpts): PacketParser;
    /**
     * packet generator
     * @param output the connection wirte output.
     * @param opts options of type {@link ConnectionOpts}.
     */
    abstract generator(output: Writable, opts: ConnectionOpts): PacketGenerator;
}

const evets = [ev.CLOSE, ev.ERROR];

export class Connection extends Duplexify {
    protected _parser: PacketParser;
    protected _generator: PacketGenerator;
    protected _regevs: Record<string, (...args: any[]) => void>;
    protected opts: ConnectionOpts;
    constructor(readonly stream: Duplex, readonly packetor: Packetor, opts: ConnectionOpts = EMPTY_OBJ) {
        super(null, null, opts = { ...opts, objectMode: true });
        this.opts = opts;

        this._parser = packetor.parser(opts);
        this._generator = packetor.generator(stream, opts);
        this.setReadable(this._parser);
        this.setWritable(this._generator);

        process.nextTick(() => {
            this.stream.pipe(this._parser);
        });

        this._regevs = {};

        evets.forEach(n => {
            const evt = this.emit.bind(this, n);
            this._regevs[n] = evt;
            this.stream.on(n, evt);
            if (n === ev.ERROR) {
                this._generator.on(n, evt);
                this._parser.on(n, evt);
            }

        });
    }


    /**
     * Enable/disable keep-alive functionality, and optionally set the initial
     * delay before the first keepalive probe is sent on an idle socket.
     *
     * Set `initialDelay` (in milliseconds) to set the delay between the last
     * data packet received and the first keepalive probe. Setting `0` for`initialDelay` will leave the value unchanged from the default
     * (or previous) setting.
     *
     * Enabling the keep-alive functionality will set the following socket options:
     *
     * * `SO_KEEPALIVE=1`
     * * `TCP_KEEPIDLE=initialDelay`
     * * `TCP_KEEPCNT=10`
     * * `TCP_KEEPINTVL=1`
     * @since v0.1.92
     * @param [enable=false]
     * @param [initialDelay=0]
     * @return The socket itself.
     */
    setKeepAlive(enable?: boolean, initialDelay?: number): this {
        (this.stream as any).setKeepAlive?.(enable, initialDelay);
        return this;
    }

    setOptions(packet: any, opts: ConnectionOpts) {
        const copts = this.opts = { ...packet, opts };
        this._parser.setOptions(copts);
        this._generator.setOptions(copts);
    }


    override destroy(error?: Error, cb?: (() => void)): this {
        if (this.destroyed) return this;

        lang.forIn(this._regevs, (e, n) => {
            this._regevs[n] = null!;
            this.stream.off(n, e);
            this._parser.off(n, e);
            this._generator.off(n, e);
        });
        if (this.stream.destroy) {
            this.stream.destroy(error);
            cb && cb();
        } else {
            this.stream.end(cb)
        }
        return this;
    }


}


export class TransportStreamCancel extends TransportExecption {
    constructor(message?: string | Error) {
        super(message instanceof Error ? message.message : message)
    }
}

