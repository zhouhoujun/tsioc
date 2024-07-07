import { isNil, isUndefined } from '@tsdi/ioc';
import { HeaderFields, HeadersLike, HeaderMappings } from './headers';



/**
 * clonable.
 */
export interface Clonable<T> {
    clone(): T;
}

/**
 * packet options.
 */
export interface PacketOpts<T = any> {
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
    /**
     * header fields.
     */
    headerFields?: HeaderFields;
}

/**
 * clone options.
 */
export interface CloneOpts<T> {
    headers?: HeadersLike;
    body?: T | null;
    payload?: T | null;
    setHeaders?: { [name: string]: string | string[]; };
}

/**
 * Packet
 */
export abstract class Packet<T> implements Clonable<Packet<T>> {
    id?: string | number;
    abstract get headers(): HeaderMappings;
    abstract get payload(): T | null;

    abstract clone(): Packet<T>;
    abstract clone<V>(update: CloneOpts<V>): Packet<V>;
    abstract clone(update: CloneOpts<T>): Packet<T>

    abstract toJson(ignores?: string[]): Record<string, any>;

    abstract attachId(id: string | number): void;
}

/**
 * base packet.
 */
export abstract class BasePacket<T> implements Packet<T> {

    readonly payload: T | null;

    id?: string | number;

    readonly headers: HeaderMappings;
    constructor(init?: PacketOpts<T>) {
        if (init) {
            this.id = init.id;
            this.headers = new HeaderMappings(init.headers, init.headerFields);
            this.payload = init.payload ?? null;
        } else {
            this.headers = new HeaderMappings();
            this.payload = null;
        }
    }

    attachId(id: string | number) {
        this.id = id;
    }

    abstract clone(): Packet<T>;
    abstract clone<V>(update: CloneOpts<V>): Packet<V>;
    abstract clone(update: CloneOpts<T>): Packet<T>

    toJson(ignores?: string[]): Record<string, any> {
        const obj = this.toRecord();
        if (!ignores) return obj;

        const record = {} as Record<string, any>;
        for (const n in obj) {
            if (ignores.indexOf(n) < 0
                && !isNil(obj[n])) {
                record[n] = obj[n];
            }
        }
        return record;
    }

    protected toRecord(): Record<string, any> {
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

    protected cloneOpts(update: CloneOpts<any>): PacketOpts {
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
 * Status packet options.
 */
export interface StatusPacketOpts<T = any, TStatus = any> extends PacketOpts<T> {
    /**
     * event type
     */
    type?: number;
    status?: TStatus;
    statusMessage?: string;
    statusText?: string;
    ok?: boolean;
    error?: any;

    defaultStatus?: TStatus;
    defaultStatusText?: string;
}

export interface StatusCloneOpts<T, TStatus> extends CloneOpts<T> {
    type?: number;
    ok?: boolean;
    status?: TStatus;
    statusMessage?: string;
    statusText?: string;
    error?: any;
}

/**
 * Status packet.
 */
export abstract class StatusPacket<T, TStatus = any> extends BasePacket<T> {
    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    readonly type: number | undefined;
    /**
     * status code.
     */
    get status(): TStatus | null {
        return this._status;
    }

    readonly error: any | null;

    readonly ok: boolean;

    protected _message: string | undefined;
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    get statusText(): string {
        return this._message!
    }

    get statusMessage(): string {
        return this._message!
    }

    /**
     * body, payload alias name.
     */
    get body(): T | null {
        return this.payload;
    }

    protected _status: TStatus | null;

    constructor(init: StatusPacketOpts) {
        super(init)
        this.ok = init.error ? false : init.ok != false;
        this.error = init.error;
        this.type = init.type;
        this._status = init.status !== undefined ? init.status : init?.defaultStatus ?? null;
        this._message = (init.statusMessage || init.statusText) ?? init?.defaultStatusText;
    }

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    hasHeader(field: string): boolean {
        return this.headers.has(field)
    }
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    getHeader(field: string): string | undefined {
        return this.headers.getHeader(field);
    }

    abstract clone(): StatusPacket<T, TStatus>;
    abstract clone<V>(update: StatusCloneOpts<V, TStatus>): StatusPacket<V, TStatus>;
    abstract clone(update: StatusCloneOpts<T, TStatus>): StatusPacket<T, TStatus>;

    protected cloneOpts(update: StatusCloneOpts<any, TStatus>): StatusPacketOpts {
        const init = super.cloneOpts(update) as StatusPacketOpts;
        init.type = update.type ?? this.type;
        init.ok = update.ok ?? this.ok;
        const status = update.status ?? this.status;
        if (status !== null) {
            init.status = status;
        }
        if (this.error || update.error) {
            init.error = update.error ?? this.error
        }
        init.statusMessage = update.statusMessage ?? update.statusText ?? this.statusMessage;
        return init;
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();

        if (!isNil(this.type)) rcd.type = this.type;
        if (!isNil(this.status)) rcd.status = this.status;
        if (this.statusMessage) rcd.statusMessage = this.statusMessage;

        rcd.ok = this.ok;

        if (this.error) {
            rcd.error = this.error
        }
        return rcd;
    }

}
