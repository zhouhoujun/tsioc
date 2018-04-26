import { createClassDecorator, IClassDecorator } from '../factories/index';
import { ClassMetadata } from '../metadatas/index';




/**
 * Abstract decorator. define for class.
 *
 * @Abstract
 */
export const Abstract: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Abstract');

