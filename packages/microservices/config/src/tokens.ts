import { token } from '@tsdi/ioc';
import { ConfigOptions } from './config';
import { ConfigSource } from './config';

/**
 * Config options token.
 */
export const CONFIG_OPTIONS = token<ConfigOptions>('CONFIG_OPTIONS');

/**
 * Extra config sources contributed by feature modules (`withEnv`, `withFile`).
 */
export const CONFIG_SOURCES = token<ConfigSource[]>('CONFIG_SOURCES');
