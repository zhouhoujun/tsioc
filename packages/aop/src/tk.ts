import { tokenId, TokenId } from '@tsdi/ioc';
import { IAdviceMatcher } from './IAdviceMatcher';
import { IAdvisor } from './IAdvisor';


/**
 * Aop IAdvisor interface token.
 * it is a token id, you can register yourself IAdvisor for this.
 */
export const AdvisorToken: TokenId<IAdvisor> = tokenId<IAdvisor>('DI_IAdvisor');

export const AOP_EXTEND_TARGET_TOKEN = tokenId<(target: any) => void>('AOP_EXTEND_TARGET_TOKEN')

/**
 * Aop advice matcher interface token.
 * it is a token id, you can register yourself IActionBuilder for this.
 */
export const AdviceMatcherToken: TokenId<IAdviceMatcher> = tokenId<IAdviceMatcher>('DI_IAdviceMatcher');
