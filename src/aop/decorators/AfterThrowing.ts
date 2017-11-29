
import { MethodMetadata } from '../../metadatas';
import { createMethodDecorator, IMethodDecorator } from '../../decorators';

export interface AfterThrowingMetadata extends  MethodMetadata {
    throwing: string;
}

export const AfterThrowing: IMethodDecorator<MethodMetadata> = createMethodDecorator<MethodMetadata>('AfterThrowing');
