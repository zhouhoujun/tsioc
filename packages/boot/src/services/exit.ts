import { Abstract } from '@tsdi/ioc';
import { BootContext } from '../boot/ctx';

@Abstract()
export abstract class ApplicationExit  {
    abstract get enable(): boolean;
    abstract set enable(enable: boolean);
    abstract exit(context: BootContext, err?: Error): void;
}