import { Abstract, isNil, isUndefined } from '@tsdi/ioc';
import { HeaderFields, HeadersLike, HeaderMappings } from './headers';


export interface PacketOpts {
    readonly headerFields?: HeaderFields;
    readonly defaultMethod?: string;
}


export interface PacketInitOpts<T = any> {
    /**
     * packet id.
     */
    id?: string | number,
    /**
     * headers of packet.
     */
    headers?: HeadersLike;
    /**
     * payload of packet.
     */
    payload?: T | null;
}

/**
 * packet.
 */
export abstract class Packet<T = any> {

    readonly payload: T | null;

    private _id: string | number | undefined;
    get id(): string | number | undefined {
        return this._id;
    }

    readonly headers: HeaderMappings;
    constructor(init: PacketInitOpts<T>, protected options?: PacketOpts) {
        this._id = init.id;
        this.headers = new HeaderMappings(init.headers, options?.headerFields);
        this.payload = init.payload ?? null;
    }

    attachId(id: string | number) {
        this._id = id;
    }

    abstract clone(): Packet<T>;
    abstract clone(update: {
        headers?: HeadersLike;
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
    }): Packet<T>
    abstract clone<V>(update: {
        headers?: HeadersLike;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
    }): Packet<V>;

    toJson(): Record<string, any> {
        const record = {} as Record<string, any>;
        if (this.id) {
            record.id = this.id;
        }
        if (this.headers.size) {
            record.headers = this.headers.getHeaders();
        }
        if (!isNil(this.payload)) {
            record.payload = this.payload;
        }
        return record;

    }

    protected cloneOpts(update: {
        headers?: HeadersLike;
        body?: any;
        payload?: any;
        setHeaders?: { [name: string]: string | string[]; };
    }): PacketInitOpts {
        // The payload is somewhat special - a `null` value in update.payload means
        // whatever current payload is present is being overridden with an empty
        // payload, whereas an `undefined` value in update.payload implies no
        // override.
        let payload = isUndefined(update.payload) ? update.body : update.payload;
        if (isUndefined(payload)) {
            payload = this.payload;
        }

        // Headers and params may be appended to if `setHeaders` or
        // `setParams` are used.
        let headers: HeaderMappings;
        if (update.headers instanceof HeaderMappings) {
            headers = update.headers;
        } else {
            headers = this.headers;
            update.headers && headers.setHeaders(update.headers);
        }
        // Check whether the caller has asked to add headers.
        if (update.setHeaders !== undefined) {
            // Set every requested header.
            headers =
                Object.keys(update.setHeaders)
                    .reduce((headers, name) => headers.set(name, update.setHeaders![name]), headers)
        }

        const id = this.id;
        return { id, headers, payload };
    }

}


/**
 * status packet data.
 */
export interface StatusInitOpts<T = any, TStatus = any> extends PacketInitOpts<T> {
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

export interface StatusPacketOpts<TStatus = number> extends PacketOpts {
    defaultStatus?: TStatus;
    defaultStatusText?: string
}

/**
 * Status packet.
 */

export abstract class StatusPacket<T = any, TStatus = number> extends Packet<T> {
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

    constructor(init: StatusInitOpts, options?: StatusPacketOpts<TStatus>) {
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
    }): StatusInitOpts {
        const init = super.cloneOpts(update) as StatusInitOpts;
        init.type = update.type ?? this.type;
        init.ok = update.ok ?? this.ok;
        const status = update.status ?? this.status;
        if (status !== null) {
            init.status = status;
        }
        init.statusMessage = update.statusMessage ?? update.statusText ?? this.statusMessage;
        return init;
    }

    abstract clone(): StatusPacket<T, TStatus>;
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
    }): StatusPacket<T, TStatus>
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
    }): StatusPacket<V, TStatus>;

}


@Abstract()
export abstract class PacketFactory {
    abstract create(packet: PacketInitOpts, options?: PacketOpts): Packet;
    abstract create<T>(packet: PacketInitOpts<T>, options?: PacketOpts): Packet<T>
}