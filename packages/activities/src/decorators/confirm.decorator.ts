import { createDecorator } from '@tsdi/ioc';
import { ConfirmActivityOptions } from '../activities/Confirm';

export const Confirm = createDecorator<ConfirmActivityOptions>('Confirm', {}); 