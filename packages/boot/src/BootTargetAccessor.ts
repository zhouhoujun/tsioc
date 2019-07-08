import { BootContext } from './BootContext';
import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class BootTargetAccessor {
    abstract getBoot(target: any, ctx?: BootContext): any;
}
