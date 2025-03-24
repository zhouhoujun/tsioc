import { createDecorator } from '@tsdi/ioc';
import { SequenceActivityOptions } from '../activities/Sequence';

export const Sequence = createDecorator<SequenceActivityOptions>('Sequence', {}); 