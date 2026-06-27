import { ContextToken } from '@tsdi/ioc';

export const SOCKET = new ContextToken<any>(() => null);
export const COAP_RESPONSE = new ContextToken<any>(() => null);
