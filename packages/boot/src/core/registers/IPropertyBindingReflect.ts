import { ClassType, ITypeReflect, Token } from '@tsdi/ioc';

export interface IBinding<T> {
    name: string;
    bindingName?: string;
    type: ClassType<T>;
    provider?: Token<T>,
    bindingValue?: T;
    defaultValue?: T;
}

export interface IBindingTypeReflect extends ITypeReflect {
    propBindings: Map<string, IBinding<any>>;
    paramsBindings: Map<string, IBinding<any>[]>;
}
