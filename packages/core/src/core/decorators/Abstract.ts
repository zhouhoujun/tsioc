import { createClassDecorator, ITypeDecorator } from '../factories/index';
import { ClassMetadata } from '../metadatas/index';



/**
 * Abstract decorator. define for class.
 *
 * @Abstract
 */
export const Abstract: ITypeDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Abstract');

