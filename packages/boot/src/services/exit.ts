import { Abstract } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';

@Abstract()
export abstract class ApplicationExit {

    abstract register(context: ApplicationContext): void;

    abstract exit(context: ApplicationContext);
}

