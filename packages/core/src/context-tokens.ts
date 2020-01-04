import { InjectToken, Token, ClassType } from '@tsdi/ioc';

export const CTX_CURR_TOKEN = new InjectToken<Token>('CTX_CURR_TOKEN');
export const CTX_CURR_TYPE = new InjectToken<ClassType>('CTX_CURR_TYPE');
export const CTX_TARGET_REFS = new InjectToken<any[]>('CTX_TARGET_REFS');
export const CTX_TOKENS = new InjectToken<Token[]>('CTX_TOKENS');
export const CTX_TYPES = new InjectToken<ClassType[]>('CTX_TOKENS');
