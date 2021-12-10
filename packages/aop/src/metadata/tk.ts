import { tokenId, Token } from '@tsdi/ioc';
import { IAdviceMatcher } from '../IAdviceMatcher';


export const AOP_EXTEND_TARGET_TOKEN = tokenId<(target: any) => void>('AOP_EXTEND_TARGET_TOKEN')

/**
 * Aop advice matcher interface token.
 * it is a token id, you can register yourself IActionBuilder for this.
 */
export const ADVICE_MATCHER: Token<IAdviceMatcher> = tokenId<IAdviceMatcher>('AOP_ADVICE_MATCHER');
/**
 * Aop advice matcher interface token.
 *
 * @deprecated use `ADVICE_MATCHER` instead.
 */
export const AdviceMatcherToken = ADVICE_MATCHER;

