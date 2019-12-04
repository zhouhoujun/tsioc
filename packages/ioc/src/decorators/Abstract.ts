import { createClassDecorator, ITypeDecorator } from '../factories/ClassDecoratorFactory';
import { ClassMetadata } from '../metadatas/ClassMetadata';



/**
 * Abstract decorator. define for class.
 *
 * @Abstract
 */
export const Abstract: ITypeDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Abstract');

