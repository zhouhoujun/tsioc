
/**
 * Listen options.
 */
export interface ListenOpts {

    [x: string]: any;

    /**
    * When provided the corresponding `AbortController` can be used to cancel an asynchronous action.
    */
    signal?: AbortSignal;
    port?: number;
    host?: string;
    backlog?: number;
    path?: string;
    exclusive?: boolean;
    readableAll?: boolean;
    writableAll?: boolean;
    /**
     * @default false
     */
    ipv6Only?: boolean;
    withCredentials?: boolean;
}

/**
 * listen service.
 */
export interface ListenService<LOpt = ListenOpts> {
    listen(options: LOpt | number, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
}
