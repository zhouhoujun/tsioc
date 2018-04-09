import { createClassDecorator, IClassDecorator } from '../factories/index';
import { ClassMetadata } from '../metadatas/index';




/**
 * IocModule decorator and metadata. define a class.
 *
 * @IocModule
 */
export const IocModule: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('IocModule');

