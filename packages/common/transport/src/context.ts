import { ContextToken } from '@tsdi/ioc';


export const TEXT_DECODER = new ContextToken(()=> new TextDecoder());

export const PACKET_DELIMITER = new ContextToken(() => '\n');

export const PACKET_MAXSIZE = new ContextToken(() => 1024 * 1024);

export const PACKET_LIMIT = new ContextToken(() => 1024 * 1024);

export const PACKET_IDLEN = new ContextToken(() => 2);
