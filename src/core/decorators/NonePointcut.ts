import { createClassDecorator, IClassDecorator } from '../factories/index';
import { ClassMetadata } from '../metadatas/index';

/**
 * NonePointcut decorator, define class not work with aop.
 *
 * @NonePointcut
 */
export const NonePointcut: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('NonePointcut');
