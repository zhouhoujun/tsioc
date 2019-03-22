import { Abstract, IocResolveAction } from '@ts-ioc/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';



@Abstract()
export abstract class IocResolveServicesAction extends IocResolveAction {
    abstract execute(ctx: ResolveServicesContext, next: () => void): void;
}
