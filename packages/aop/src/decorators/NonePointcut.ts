import { createClassDecorator, IClassDecorator, ClassMetadata } from '@ts-ioc/core';

/**
 * NonePointcut decorator, define class not work with aop.
 *
 * @NonePointcut
 */
export const NonePointcut: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('NonePointcut');
