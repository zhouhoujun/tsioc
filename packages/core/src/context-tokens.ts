import { InjectToken, Token, ClassType } from '@tsdi/ioc';
export const CTX_CURR_TOKEN = new InjectToken<Token>('CTX_CURR_TOKEN');
export const CTX_CURR_TYPE = new InjectToken<ClassType>('CTX_CURR_TYPE');
export const CTX_CURR_TARGET_TYPE = new InjectToken<ClassType>('CTX_CURR_TARGET_TYPE');
export const CTX_TARGET_REFS = new InjectToken<any[]>('CTX_TARGET_REFS');
