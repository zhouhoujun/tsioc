import { tokenId, Type } from '@tsdi/ioc';

/**
 * db connections.
 */
export const CONNECTIONS = tokenId<ConnectionOptions[]>('CONNECTIONS');

/**
 * connection options
 */
export interface ConnectionOptions extends Record<string, any> {
    asDefault?: boolean;
    name?: string;
    /**
     * db type.
     */
    type: string;
    host: string;
    database: string;

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
