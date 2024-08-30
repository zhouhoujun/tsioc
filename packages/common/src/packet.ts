import { isNil, isUndefined } from '@tsdi/ioc';
import { HeadersLike, HeaderMappings } from './headers';
import { Clonable } from './Clonable';
import { Serializable } from './Serializable';



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
export abstract class Packet<T> implements Clonable<Packet<T>>, Serializable {
    id?: string | number;
    abstract get headers(): HeaderMappings;
    abstract get payload(): T | null;

    abstract clone(): Packet<T>;
    abstract clone<V>(update: CloneOpts<V>): Packet<V>;
    abstract clone(update: CloneOpts<T>): Packet<T>

    abstract serialize(ignores?: string[]): Record<string, any>;

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
            this.headers = new HeaderMappings(init.headers);
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

    serialize(ignores?: string[]): Record<string, any> {
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
