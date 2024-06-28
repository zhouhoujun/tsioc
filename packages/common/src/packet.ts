import { isNil, isUndefined } from '@tsdi/ioc';
import { HeaderFields, HeadersLike, HeaderMappings } from './headers';

/**
 * packet init options.
 */
export interface PacketInitOpts {
    /**
     * packet id.
     */
    id?: string | number,
    /**
     * headers of packet.
     */
    headers?: HeadersLike;
    /**
     * header fields.
     */
    headerFields?: HeaderFields;
}


export interface PayloadOpts<T = any> {
    /**
     * payload of packet.
     */
    payload?: T | null;
}

export interface BodyOpts<T = any> {
    /**
     * body of packet.
     */
    body?: T | null;
}

/**
 * packet options.
 */
export interface PacketOpts<T = any> extends PacketInitOpts, PayloadOpts<T> {

}

/**
 * Clone options.
 */
export interface CloneOpts<T> extends PayloadOpts<T>, BodyOpts<T> {
    setHeaders?: { [name: string]: string | string[]; };
}

/**
 * clone able.
 */
export interface Clonable<T> {
    clone(): T;
}


/**
 * packet.
 */
export abstract class Packet<T = any, TOpts extends PacketInitOpts = PacketInitOpts> implements Clonable<Packet> {

    readonly payload: T | null;

    private _id?: string | number;
    get id(): string | number | undefined {
        return this._id;
    }

    readonly headers: HeaderMappings;
    constructor(payload?: T | null, init?: TOpts) {
        this.payload = payload ?? null;
        this._id = init?.id;
        this.headers = new HeaderMappings(init?.headers, init?.headerFields);
    }

    attachId(id: string | number) {
        this._id = id;
    }

    clone(): Packet;
    clone(update: TOpts & CloneOpts<T>): Packet;
    clone<V>(update: TOpts & CloneOpts<T>): Packet<V>;
    clone(update: TOpts & CloneOpts<any> = {} as any): Packet {
        const opts = this.cloneOpts(update, update);
        return this.createInstance(opts, update);
    }

    protected abstract createInstance(initOpts: TOpts, cloneOpts: CloneOpts<any>): Packet;

    protected updatePayload(cloneOpts: CloneOpts<any>): any {

        // The payload is somewhat special - a `null` value in update.payload means
        // whatever current payload is present is being overridden with an empty
        // payload, whereas an `undefined` value in update.payload implies no
        // override.
        let payload = isUndefined(cloneOpts.payload) ? cloneOpts.body : cloneOpts.payload;
        if (isUndefined(payload)) {
            payload = this.payload;
        }
        return payload;
    }

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

    protected cloneOpts(update: TOpts, cloneOpts: CloneOpts<any>): TOpts {

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
        if (cloneOpts.setHeaders !== undefined) {
            // Set every requested header.
            headers =
                Object.keys(cloneOpts.setHeaders)
                    .reduce((headers, name) => headers.set(name, cloneOpts.setHeaders![name]), headers)
        }

        const headerFields = update.headerFields ?? headers.headerFields;
        const id = this.id;
        return { id, headers, headerFields } as TOpts;
    }

}




/**
 * Status packet options.
 */
export interface StatusInitOpts<TStatus = any> extends PacketInitOpts {
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


/**
 * Status packet.
 */
export abstract class StatusPacket<T = any, TStatus = any, TOpts extends StatusInitOpts<TStatus> = StatusInitOpts<TStatus>> extends Packet<T, TOpts> implements Clonable<StatusPacket> {
    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    readonly type: number | undefined;
    /**
     * status code.
     */
    get status(): TStatus | undefined {
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

    protected _status?: TStatus;

    constructor(payload: T | null | undefined, init: TOpts = {} as any) {
        super(payload, init)
        this.ok = init.error ? false : init.ok != false;
        this.error = init.error;
        this.type = init.type;
        this._status = init.status !== undefined ? init.status : init?.defaultStatus;
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

    clone(): StatusPacket<T>;
    clone(update: TOpts & CloneOpts<T>): StatusPacket<T>;
    clone<V>(update: TOpts & CloneOpts<T>): StatusPacket<V>;
    clone(update: TOpts & CloneOpts<any> = {} as any): StatusPacket {
        const opts = this.cloneOpts(update, update);
        return this.createInstance(opts, update);
    }

    protected abstract createInstance(initOpts: TOpts, cloneOpts: CloneOpts<any>): StatusPacket;

    protected override cloneOpts(update: TOpts, cloneOpts: CloneOpts<any>): TOpts {
        const init = super.cloneOpts(update, cloneOpts) as TOpts;
        init.type = update.type ?? this.type;
        init.ok = update.ok ?? this.ok;
        if (this.error || update.error) {
            init.error = update.error ?? this.error
        }
        init.status = update?.status ?? this.status;
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
