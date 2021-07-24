import { Abstract } from '@tsdi/ioc';
import { BootContext } from '../boot/ctx';

@Abstract()
export abstract class ApplicationExit  {
    abstract get enable(): boolean;
    abstract set enable(enable: boolean);
    abstract register(context: BootContext): void;
    abstract exit(context: BootContext, err?: Error): void;
}