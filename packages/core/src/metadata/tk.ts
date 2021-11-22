import { tokenId, Token, Resolver } from '@tsdi/ioc';
import { Configuration } from '../configure/config';
import { Context } from '../middlewares/context';
import { Service } from '../services/service';
import { Server } from '../server/server';


/**
 * config servers.
 */
 export const SERVERS = tokenId<Resolver<Server>[]>('SERVERS');

/**
 * boot services.
 */
export const SERVICES = tokenId<Resolver<Service>[]>('SERVICES');

/**
 * config token.
 */
export const CONFIGURATION = tokenId<Configuration>('CONFIGURATION');

/**
 * default configuration token.
 */
export const DEFAULT_CONFIG: Token<Configuration> = tokenId<Configuration>('DEFAULT_CONFIG');

/**
 *  appliaction boot process root path.
 */
export const PROCESS_ROOT: Token<string> = tokenId<string>('PROCESS_ROOT');

/**
 * middleware context.
 */
export const CONTEXT = Context;
