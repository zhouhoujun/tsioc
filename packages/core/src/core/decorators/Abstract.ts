import { createClassDecorator, IClassDecorator } from '../factories/index';
import { ClassMetadata } from '../metadatas/index';




/**
 * Abstract decorator and metadata. define a class.
 *
 * @Abstract
 */
export const Abstract: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Abstract');

