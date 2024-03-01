import { Socket } from './socket';
import { IReadableStream } from './stream';

/**
 * server side incoming message.
 */
export interface Incoming<T = any> extends IReadableStream {
    /**
     * packet id.
     */
    readonly id?: number;
    /**
     * topic.
     */
    readonly topic?: string;
    /**
     * message type.
     */
    readonly type?: number | string;
    /**
     * headers
     */
    readonly headers: Record<string, any>;
    /**
     * incoming URL
     */
    readonly url?: string;
    /**
     * original url.
     */
    readonly originalUrl?: string;
    /**
     * Outgoing URL parameters.
     */
    readonly params?: Record<string, string | string[] | number | any>;
    /**
     * incoming socket
     */
    readonly socket?: Socket;
    /**
     * The outgoing request method.
     */
    method?: string;
    /**
     * error.
     */
    readonly error?: any;
    /**
     * replyTo
     */
    readonly replyTo?: string;

    setTimeout?: (msecs: number, callback: () => void) => void;

    body?: T;

    rawBody?: any;
}

