import { createClassDecorator, IClassDecorator } from '../factories/index';
import { ClassMetadata } from '../metadatas/index';

/**
 * IocCore decorator, define class not work with aop.
 *
 * @IocCore
 */
export const IocCore: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('IocCore');
