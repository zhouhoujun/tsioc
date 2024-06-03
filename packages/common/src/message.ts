import { Abstract, ClassType, getClass, isUndefined } from '@tsdi/ioc';
import { IReadableStream } from '../transport';
import { Header, HeaderMappings, HeadersLike, IHeaders } from './headers';
import { Pattern } from './pattern';


export interface MessageInitOpts {
    id?: string | number;
    headers?: Record<string, any>;
    /**
     * params.
     */
    params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

    data?: Buffer | IReadableStream | null;

}


/**
 * base message.
 */
export class Message {
    protected _id?: string | number;
    get id(): string | number | undefined {
        return this._id;
    }

    readonly headers: Record<string, Header>;

    readonly params: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

    readonly data: Buffer | IReadableStream | null


    constructor(init: {
        id?: string | number;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: Buffer | IReadableStream | null;

    }) {
        this._id = init.id;
        this.data = init.data ?? null;
        this.headers = init.headers ?? {};
        this.params = init.params ?? {};
    }

    clone(update: {
        id?: number | string;
        headers?: HeadersLike;
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
        data?: Buffer | IReadableStream | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
    }): this {

        const opts = this.cloneOpts(update);

        return this.createInstance(opts);
    }


    protected cloneOpts(update: {
        id?: number | string;
        headers?: HeadersLike;
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
        data?: Buffer | IReadableStream | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
    }): MessageInitOpts {
        const id = this.id ?? update.id;
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

        // `setParams` are used.
        let params = update.params || this.params;

        // Check whether the caller has asked to set params.
        if (update.setParams) {
            // Set every requested param.
            params = Object.keys(update.setParams)
                .reduce((params, param) => {
                    params[param] = update.setParams![param];
                    return params;
                }, params)
        }

        return { id, headers, params, data }
    }

    protected createInstance(opts: MessageInitOpts) {
        const type = getClass(this) as ClassType;
        return new type(opts);
    }

    attachId(id: string | number): void {
        this._id = id;
    }
}


export class PatternMesage extends Message {
    readonly pattern: Pattern
    constructor(init: {
        id?: string | number;
        pattern: Pattern;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: Buffer | IReadableStream | null;

    }) {
        super(init)
        this.pattern = init.pattern
    }

    protected override cloneOpts(update: {
        id?: string | number | undefined;
        headers?: HeadersLike | undefined;
        params?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
        pattern?: Pattern;
        setHeaders?: { [name: string]: string | string[]; } | undefined;
        setParams?: { [param: string]: string; } | undefined;
    }): MessageInitOpts {
        const opts = super.cloneOpts(update) as MessageInitOpts & { pattern: Pattern };

        opts.pattern = update.pattern ?? this.pattern;

        return opts;


    }

}

/**
 * Message factory
 */
@Abstract()
export abstract class MessageFactory {
    abstract create(initOpts: {
        id?: string | number;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: Buffer | IReadableStream | null;

    }): Message;
    abstract create<T = any>(initOpts: {
        id?: string | number;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: T;

    }): Message;
}
