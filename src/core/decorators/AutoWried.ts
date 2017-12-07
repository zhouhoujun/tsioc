import { IParamPropDecorator, createParamPropDecorator } from '../factories';
import { AutoWiredMetadata } from '../metadatas';
import { IContainer } from '../../IContainer';
import { symbols } from '../../utils';

export const AutoWired: IParamPropDecorator<AutoWiredMetadata> = createParamPropDecorator<AutoWiredMetadata>('AutoWired');

