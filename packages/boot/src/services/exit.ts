import { Abstract } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';

@Abstract()
export abstract class ApplicationExit {

    abstract get enable(): boolean;

    abstract set enable(enable: boolean);

    abstract get context(): ApplicationContext;

    abstract register(): void;

    abstract exit(error?: Error);
}

