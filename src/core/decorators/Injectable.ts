import { Type } from '../../Type';
import { createClassDecorator, IClassDecorator } from '../factories/index';
import { Token } from '../../types';
import { InjectableMetadata } from '../metadatas/index';
import { isClass } from '../../utils/index';



/**
 * Injectable decorator and metadata. define a class.
 *
 * @Injectable
 */
export const Injectable: IClassDecorator<InjectableMetadata> = createClassDecorator<InjectableMetadata>('Injectable');

