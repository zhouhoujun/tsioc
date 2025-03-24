import { createDecorator } from '@tsdi/ioc';
import { TryCatchActivityOptions } from '../activities/TryCatch';

export const TryCatch = createDecorator<TryCatchActivityOptions>('TryCatch', {}); 