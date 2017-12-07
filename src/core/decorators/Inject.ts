import { IParamPropDecorator, createParamPropDecorator } from '../factories';
import { InjectMetadata } from '../metadatas';


export const Inject: IParamPropDecorator<InjectMetadata> = createParamPropDecorator<InjectMetadata>('Inject');
