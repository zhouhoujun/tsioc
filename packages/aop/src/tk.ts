import { tokenId, Token } from '@tsdi/ioc';
import { IAdviceMatcher } from './IAdviceMatcher';
import { IAdvisor } from './IAdvisor';


/**
 * Aop advisor interface token.
 * it is a token id, you can register yourself IAdvisor for this.
 */
export const ADVISOR: Token<IAdvisor> = tokenId<IAdvisor>('AOP_ADVISOR');
/**
 * Aop advisor interface token.
 *
 * @deprecated use `ADVISOR` instead.
 */
export const AdvisorToken = ADVISOR;

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

