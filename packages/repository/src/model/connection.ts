import { tokenId, Type } from '@tsdi/ioc';

/**
 * db connections.
 */
export const CONNECTIONS = tokenId<ConnectionOptions[]>('CONNECTIONS');

/**
 * connection options
 */
export interface ConnectionOptions extends Record<string, any> {
    /**
     * connection name, default as `default`
     */
    name?: string;

    /**
     * set connection as default connection.
     * @deprecated name `default` or not config name will as default.
     */
    asDefault?: boolean;
    /**
     * db type.
     */
    type?: string;
    host?: string;
    database?: string;

    port?: number;
    username?: string;
    password?: string;
    /**
     * orm modles.
     */
    entities?: Array<string | Type>;
    /**
     * repositories of orm.
     */
    repositories?: Array<string | Type>;
}
