
import { tokenId } from '@tsdi/ioc';
import { ListenOptions } from 'net';


/**
 * transport server listen options.
 */
 export interface ListenOpts extends ListenOptions {
  majorVersion?: number;
  withCredentials?: boolean;
}

/**
 *  transport server listen options.
 */
export const LISTEN_OPTS = tokenId<ListenOpts>('LISTEN_OPTS');