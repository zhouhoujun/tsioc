import { InjectToken, Token, ClassType } from '@tsdi/ioc';
import { TargetRef } from './TargetService';

export const CTX_CURR_TOKEN = new InjectToken<Token>('CTX_CURR_TOKEN');
export const CTX_CURR_TYPE = new InjectToken<ClassType>('CTX_CURR_TYPE');
export const CTX_CURR_TARGET_REF = new InjectToken<TargetRef>('CTX_CURR_TARGET_REF');
export const CTX_CURR_TARGET_TOKEN = new InjectToken<Token>('CTX_CURR_TARGET_TOKEN');
export const CTX_CURR_TARGET_TYPE = new InjectToken<ClassType>('CTX_CURR_TARGET_TYPE');

export const CTX_TARGET_REFS = new InjectToken<TargetRef[]>('CTX_TARGET_REFS');
