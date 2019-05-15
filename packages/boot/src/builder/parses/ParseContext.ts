import { IBinding } from '../../core';
import { IContainer } from '@tsdi/core';
import { ContainerFactory, Injectable, Type } from '@tsdi/ioc';
import { BuildContext, IModuleResolveOption } from '../resovers/BuildContext';
import { IComponentContext } from '../ComponentContext';

export interface IBindingParseOption extends IModuleResolveOption  {
    scope?: any;
    selector?: Type<any>;
    binding?: IBinding<any>;
}

@Injectable
export class ParseContext extends BuildContext implements IComponentContext {

    selector?: Type<any>;

    binding?: IBinding<any>;

    scope?: any;

    value?: any;

    getRaiseContainer(): IContainer {
        return this.raiseContainerGetter() as IContainer;
    }

    static parse(type: Type<any>, options: IBindingParseOption, raiseContainer: IContainer | ContainerFactory): ParseContext {
        let ctx = new ParseContext(type);
        ctx.setOptions(options);
        raiseContainer && ctx.setRaiseContainer(raiseContainer);
        return ctx;
    }
}
