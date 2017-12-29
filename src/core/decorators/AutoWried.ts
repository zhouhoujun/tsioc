import { IParamPropDecorator, createParamPropDecorator } from '../factories/index';
import { AutoWiredMetadata } from '../metadatas/index';
import { IContainer } from '../../IContainer';
import { symbols } from '../../utils/index';

export const AutoWired: IParamPropDecorator<AutoWiredMetadata> = createParamPropDecorator<AutoWiredMetadata>('AutoWired');

