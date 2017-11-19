
import { Type } from '../Type';
import { IParamPropDecorator, createParamPropDecorator } from './ParamPropDecoratorFactory';
import { InjectMetadata } from '../metadatas';


export const Inject: IParamPropDecorator<InjectMetadata> = createParamPropDecorator<InjectMetadata>('Inject');
