import { tokenId } from '@tsdi/ioc';

/**
 * Listen options.
 */
export interface ListenOpts {

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

export const HTTP_LISTEN_OPTS = tokenId<ListenOpts>('HTTP_LISTEN_OPTS');

export interface BindListenning {
    listen(listeningListener?: () => void): this;
    listen(options: number, listeningListener?: () => void): this;
}
/**
 * listen service.
 */
export interface ListenService<LOpt = ListenOpts> {
    listen(options: LOpt | number, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
}

/**
 * binding server.
 */
export interface ServerBinding<T = any> {
    bind(server: T): void;
}