import { Header, HeaderAccess } from './headers';
import { IReadable } from './stream';

/**
 * Incoming message
 */
export interface IncomingMessage<T = any, TMsg = any, THead extends Header = Header> extends HeaderAccess<THead> {

    id?: number | string;
    /**
     * origin req message.
     */
    origin?: TMsg;

    pattern?: string;

    /**
     * incoming body.
     */
    body?: T | null;

}


/**
 * Server incoming message
 */
export interface Incoming<T = any, TMsg = any> extends IncomingMessage<T, TMsg> {

    method?: string;
    
    cookies?: any;

    params?: Record<string, any>;

    query?: Record<string, any>;

    rawBody?: any;

    path?: any;

}

/**
 * incoming message with status
 */
export interface StatusIncoming<T = any, TStatus = any, TMsg = any> extends IncomingMessage<T, TMsg> {
    /**
     * event type
     */
    type?: number;

    status?: TStatus | null;

    statusCode?: TStatus | null;

    statusMessage?: string;

    statusText?: string;

    ok?: boolean;
    error?: any;

}


export type TIncoming<T extends Incoming> = T | (T & IReadable);