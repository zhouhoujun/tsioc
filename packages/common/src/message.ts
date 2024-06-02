import { Abstract, ClassType, getClass, isUndefined } from '@tsdi/ioc';
import { IReadableStream } from '../transport';
import { HeaderMappings, HeadersLike, IHeaders } from './headers';


export interface MessageInitOpts {
    id?: string | number;
    headers?: Record<string, any>;
}


/**
 * base message.
 */
export class Message {
    protected _id?: string | number;
    get id(): string | number | undefined {
        return this._id;
    }

    readonly headers: Record<string, any>;

    constructor(readonly data: Buffer | IReadableStream | null, init: MessageInitOpts = {}) {
        this._id = init.id;
        this.headers = init.headers ?? {};
    }

    clone(update: {
        headers?: HeadersLike;
        data?: Buffer | IReadableStream | null;
        setHeaders?: { [name: string]: string | string[]; };
    }): this {
        const id = this.id;
        const data = isUndefined(update.data) ? this.data : update.data;
        // Headers and params may be appended to if `setHeaders` or
        // `setParams` are used.
        let headers: IHeaders;
        if (update.headers instanceof HeaderMappings) {
            headers = update.headers.getHeaders();
        } else {
            headers = update.headers ? Object.assign(update.headers, this.headers) : this.headers;
        }
        // Check whether the caller has asked to add headers.
        if (update.setHeaders !== undefined) {
            // Set every requested header.
            headers =
                Object.keys(update.setHeaders)
                    .reduce((headers, name) => {
                        headers[name] = update.setHeaders![name];
                        return headers;
                    }, headers)
        }

        return this.createInstance(data, { id, headers });
    }

    protected createInstance(data: Buffer | IReadableStream | null, options: MessageInitOpts) {
        const type = getClass(this) as ClassType;
        return new type(data, options);
    }

    attachId(id: string | number): void {
        this._id = id;
    }
}

/**
 * Message factory
 */
@Abstract()
export abstract class MessageFactory {
    abstract create(data: any, options?: { id?: string | number | null, headers?: Record<string, any> }): Message;
    abstract create<T = any>(data: T, options?: { id?: string | number, headers?: Record<string, any> }): Message;
}
