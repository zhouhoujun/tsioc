import { HeadersLike } from './headers';
import { Packet, PacketInitOpts, PacketOpts } from './packet';



/**
 * Outgoing packet data.
 */
export interface OutgoingInitOpts<T = any, TStatus = any> extends PacketInitOpts<T> {
    /**
     * event type
     */
    type?: number;
    status?: TStatus;
    statusMessage?: string;
    statusText?: string;
    ok?: boolean;
    error?: any;
}

export interface OutgoingPacketOpts<TStatus = number> extends PacketOpts {
    defaultStatus?: TStatus;
    defaultStatusText?: string
}

/**
 * Status packet.
 */

export abstract class OutgoingPacket<T = any, TStatus = number> extends Packet<T> {
    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    readonly type: number | undefined;
    /**
     * Response status code.
     */
    readonly status: TStatus | null;

    readonly error: any | null;

    readonly ok: boolean;

    protected _message!: string;
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    get statusText(): string {
        return this._message
    }

    get statusMessage(): string {
        return this._message
    }

    /**
     * body, payload alias name.
     */
    get body(): T | null {
        return this.payload;
    }

    constructor(init: OutgoingInitOpts, options?: OutgoingPacketOpts<TStatus>) {
        super(init, options)
        this.ok = init.error ? false : init.ok != false;
        this.error = init.error;
        this.type = init.type;
        this.status = init.status !== undefined ? init.status : options?.defaultStatus ?? null;
        this._message = (init.statusMessage || init.statusText) ?? options?.defaultStatusText ?? '';
    }

    protected cloneOpts(update: {
        headers?: HeadersLike;
        payload?: any;
        setHeaders?: { [name: string]: string | string[]; };
        type?: number;
        ok?: boolean;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        error?: any;
    }): OutgoingInitOpts {
        const init = super.cloneOpts(update) as OutgoingInitOpts;
        init.type = update.type ?? this.type;
        init.ok = update.ok ?? this.ok;
        const status = update.status ?? this.status;
        if (status !== null) {
            init.status = status;
        }
        init.statusMessage = update.statusMessage ?? update.statusText ?? this.statusMessage;
        return init;
    }

    abstract clone(): OutgoingPacket<T, TStatus>;
    abstract clone(update: {
        headers?: HeadersLike;
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
        type?: number;
        ok?: boolean;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        error?: any;
    }): OutgoingPacket<T, TStatus>
    abstract clone<V>(update: {
        headers?: HeadersLike;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        type?: number;
        ok?: boolean;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        error?: any;
    }): OutgoingPacket<V, TStatus>;

}
