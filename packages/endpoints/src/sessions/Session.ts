import { Abstract, token } from '@tsdi/ioc';
import { AbstractRequestContext } from '../AbstractRequestContext';

/**
 * Session 配置选项接口
 */
export interface SessionOptions {
    /** session key */
    key?: string;
    /** 是否覆盖 */
    overwrite?: boolean;
    /** 是否仅允许 HTTP 访问 */
    httpOnly?: boolean;
    /** 是否签名 */
    signed?: boolean;
    /** 是否自动提交 */
    autoCommit?: boolean;
    /** 过期时间（毫秒） */
    maxAge?: number;
    /** 编码函数 */
    encode?: (body: any) => string;
    /** 解码函数 */
    decode?: (str: string) => any;
}

export const SESSION_OPTIONS = token<SessionOptions>('SESSION_OPTIONS');

/**
 * session storage.
 */
@Abstract()
export abstract class Session {
    abstract get id(): string;
    abstract get userId(): string | number;
    abstract get user(): any;
    abstract get createdAt(): number;
    abstract get expiresAt(): number;
    abstract get data(): Record<string, unknown>;
    abstract get cookie(): {
        path?: string;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'strict' | 'lax' | 'none';
    } | undefined;
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
     * check session is valid
     */
    abstract isValid(): boolean;
    /**
     * check session is modified
     */
    abstract isModified(): boolean;

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


@Abstract()
export abstract class SessionManager {
    /**
     * session login.
     * @param user 
     */
    abstract login(ctx: AbstractRequestContext, user: any): Promise<void>;
    
    /**
     * session logout. 
     */
    abstract logout(ctx: AbstractRequestContext): Promise<void>;
}
