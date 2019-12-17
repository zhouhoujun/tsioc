import { IocCompositeAction, IocAction } from '@tsdi/ioc';
import { InjectActionContext } from './InjectActionContext';


export abstract class InjectAction extends IocAction<InjectActionContext> {

}


export abstract class InjectScope extends IocCompositeAction<InjectActionContext> {

}
