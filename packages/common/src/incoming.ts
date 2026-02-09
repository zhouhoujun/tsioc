import { Header, HeaderAccess } from './headers';

/**
 * Incoming message
 */
export interface IncomingMessage<T = any, THead extends Header = Header> extends HeaderAccess<THead> {

    id?: number | string;

    pattern?: string;

    /**
     * incoming body.
     */
    body?: T | null;

}


/**
 * Server incoming message
 */
export interface BaseIncoming<T = any, TMsg = any> extends IncomingMessage<T> {

    /**
     * origin req message.
     */
    req?: TMsg;

    method?: string;

    cookies?: any;

    params?: Record<string, any>;

    query?: Record<string, any>;

    rawBody?: any;

    paths?: any;
}

/**
 * pattern incoming
 */
export interface PatternIncoming<T = any, TMsg = any> extends BaseIncoming<T, TMsg> {
    pattern: string;
}

/**
 * url incoming
 */
export interface UrlIncoming<T = any, TMsg = any> extends BaseIncoming<T, TMsg> {
    url: string;
}

/**
 * topic incoming
 */
export interface TopicIncoming<T = any, TMsg = any> extends BaseIncoming<T, TMsg> {
    topic: string;
    responseTopic?: string;
}

/**
 * Server incoming message
 */
export type Incoming<T = any, TMsg = any> = PatternIncoming<T, TMsg> | UrlIncoming<T, TMsg> | TopicIncoming<T, TMsg>;


/**
 * client incoming message with status
 */
export interface ClientIncoming<T = any, TStatus = any> extends IncomingMessage<T>{
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
