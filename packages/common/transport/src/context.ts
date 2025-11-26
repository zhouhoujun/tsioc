import { ContextToken } from '@tsdi/ioc';


export const TEXT_DECODER = new ContextToken(()=> new TextDecoder());
