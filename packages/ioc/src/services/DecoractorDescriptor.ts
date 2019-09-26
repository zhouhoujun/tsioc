import { DecoratorType } from '../factories';
import { InjectToken } from '../InjectToken';

/**
 * decoractor infomantion descriptor.
 *
 * @export
 * @interface DecoractorDescriptor
 */
export interface DecoractorDescriptor {
    annoation?: boolean;
    decoractor: string | Function;
    type: DecoratorType;
    classMetaKey?: string;
    methodMetaKey?: string;
    propMetaKey?: string;
    paramMetaKey?: string;
}

export const DecoractorDescriptorToken = new InjectToken<DecoractorDescriptor>('__decoractor_details');
