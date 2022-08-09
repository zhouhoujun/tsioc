import { Middleware, ConnectionContext } from '@tsdi/core';
import { Abstract, Injectable, Nullable } from '@tsdi/ioc';


/**
 * session
 */
@Abstract()
export abstract class Session {
    /**
     * init & load session. 
     */
    abstract load(): Promise<void>;
    /**
     * secret.
     */
    abstract secret: string;
    /**
     * Return how many values there are in the session object.
     * Used to see if it's "populated".
     */
    abstract get length(): number;
    /**
     *  populated flag, which is just a boolean alias of .length.
     *
     * @return {Boolean}
     * @api public
     */
    abstract get populated(): boolean;

    /**
     * get session maxAge
     *
     * @return {Number}
     * @api public
     */
    abstract get maxAge(): number;
    /**
     * set session maxAge
     *
     * @param {Number}
     * @api public
     */
    abstract set maxAge(age: number);

    /**
     * get session external key
     * only exist if opts.store present
     */
    abstract get externalKey(): string;

    /**
     * save this session no matter whether it is populated
     *
     * @api public
     */
    abstract save(): Promise<void>;

    /**
     * commit this session's headers if autoCommit is set to false
     *
     * @api public
     */
    abstract commit(): Promise<void>;

    /**
     * JSON representation of the session.
     */
    abstract toJSON(): Record<string, any>;
}

/**
 * session options.
 */
@Abstract()
export abstract class SessionOptions {
    abstract key: string;
    abstract maxAge?: number;
    abstract overwrite?: boolean;
    abstract httpOnly?: boolean;
    abstract signed?: boolean;
    abstract externalKey?: string;
    abstract autoCommit?: boolean;
    abstract encode?: (body: Object) => string;
    abstract decode?: (str: string) => Object;
}

const defOpts = {
    key: 'transport',
    overwrite: true,
    httpOnly: true,
    signed: true,
    autoCommit: true,
    encode,
    decode
} as SessionOptions;

/**
 * session middleware.
 */
@Injectable()
export class SessionMiddleware implements Middleware {

    private options: SessionOptions;
    constructor(@Nullable() options: SessionOptions) {
        this.options = {
            ...defOpts,
            ...options
        }
    }

    async invoke(ctx: ConnectionContext, next: () => Promise<void>): Promise<void> {
        ctx.setValue(SessionOptions, this.options);
        const se = ctx.resolve(Session);
        await se.load();
        try {
            await next();
        } finally {
            if (this.options.autoCommit) {
                await se.commit();
            }
        }
    }
}

/**
 * Decode the base64 cookie value to an object.
 *
 * @param {String} string
 * @return {Object}
 * @api private
 */
function decode(str: string): Object {
    const body = Buffer.from(str, 'base64').toString('utf8');
    const json = JSON.parse(body);
    return json;
}

/**
 * Encode an object into a base64-encoded JSON string.
 *
 * @param {Object} body
 * @return {String}
 * @api private
 */
function encode(body: any): string {
    body = JSON.stringify(body);
    return Buffer.from(body).toString('base64')
}
