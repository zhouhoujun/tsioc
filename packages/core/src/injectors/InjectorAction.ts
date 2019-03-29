import { IocAction, IocCompositeAction } from '@ts-ioc/ioc';
import { InjectorActionContext } from './InjectorActionContext';


export abstract class InjectorAction<T extends InjectorActionContext> extends IocAction<T> {

}


export abstract class InjectorScope<T extends InjectorActionContext> extends IocCompositeAction<T> {
    abstract setup();
}
