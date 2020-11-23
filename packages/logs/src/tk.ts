import { tokenId, TokenId } from '@tsdi/ioc';
import { ILoggerManager } from './ILoggerManager';
import { LogConfigure } from './LogConfigure';

/**
 * LoggerManger interface token.
 * it is a token id, you can register yourself LoggerManger for this.
 */
export const LoggerManagerToken: TokenId<ILoggerManager> = tokenId<ILoggerManager>('DI_ILoggerManager');


/**
 * Log configure interface symbol.
 * it is a symbol id, you can register yourself LogConfigure for this.
 */
export const LogConfigureToken: TokenId<LogConfigure> = tokenId<LogConfigure>('DI_LogConfigure');
