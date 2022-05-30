
import { tokenId } from '@tsdi/ioc';
import { ListenOptions } from 'net';

/**
 * http listen options.
 */
 export interface HttpListenOptions extends ListenOptions {
    majorVersion?: number;
    withCredentials?: boolean;
  }
  
  /**
   *  http server ListenOptions.
   */
  export const HTTP_LISTENOPTIONS = tokenId<HttpListenOptions>('HTTP_LISTENOPTIONS');