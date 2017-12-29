import { IParamPropDecorator, createParamPropDecorator } from '../factories/index';
import { InjectMetadata } from '../metadatas/index';


export const Inject: IParamPropDecorator<InjectMetadata> = createParamPropDecorator<InjectMetadata>('Inject');
