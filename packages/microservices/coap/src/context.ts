import { ContextToken } from '@tsdi/ioc';

export const SOCKET = new ContextToken<any>(() => null);
