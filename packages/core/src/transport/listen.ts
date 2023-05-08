import { Abstract } from '@tsdi/ioc';

/**
 * Listen options.
 */
@Abstract()
export abstract class ListenOpts {

    [x: string]: any;

    /**
    * When provided the corresponding `AbortController` can be used to cancel an asynchronous action.
    */
    signal?: AbortSignal | undefined;
    port?: number | undefined;
    host?: string | undefined;
    backlog?: number | undefined;
    path?: string | undefined;
    exclusive?: boolean | undefined;
    readableAll?: boolean | undefined;
    writableAll?: boolean | undefined;
    /**
     * @default false
     */
    ipv6Only?: boolean | undefined;
    withCredentials?: boolean;
}

/**
 * listen service.
 */
export interface ListenService<LOpt = ListenOpts> {
    listen(options: LOpt, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
}

/**
 * binding server.
 */
export interface ServerBinding<T = any> {
    bind(server: T): void;
}