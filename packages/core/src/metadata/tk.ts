import { tokenId, Token } from '@tsdi/ioc';

/**
 * appliaction boot process root path.
 */
export const PROCESS_ROOT: Token<string> = tokenId<string>('PROCESS_ROOT');
