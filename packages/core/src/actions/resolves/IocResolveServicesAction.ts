import { Abstract } from '@ts-ioc/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { IocResolveAction } from './IocResolveAction';


@Abstract()
export abstract class IocResolveServicesAction extends IocResolveAction {
    abstract execute(ctx: ResolveServicesContext, next: () => void): void;
}
