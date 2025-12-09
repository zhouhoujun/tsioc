import { ContextToken, token } from '@tsdi/ioc';
import { Socket } from './socket';


export const TEXT_DECODER = new ContextToken(() => new TextDecoder());

export const PACKET_DELIMITER = new ContextToken(() => '\n');

export const PACKET_MAXSIZE = new ContextToken(() => 1024 * 1024);

export const PACKET_LIMIT = new ContextToken(() => 1024 * 1024);

export const PACKET_IDLEN = new ContextToken(() => 2);

export const SOCKET = token<Socket>('SOCKET');
