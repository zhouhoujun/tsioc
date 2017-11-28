import { IContainer } from './IContainer';
import { IMethodAccessor } from './IMethodAccessor';
import { Type } from './Type';
import { isFunction } from 'util';
import { Singleton, Inject } from './decorators/index';
import { symbols } from './types';

@Singleton(symbols.IMethodAccessor)
export class MethodAccessor implements IMethodAccessor {


    constructor( @Inject(symbols.IContainer) private container: IContainer) {

    }

    async invoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any): Promise<T> {
        instance = instance || this.container.get(type);
        if (instance && isFunction(instance[propertyKey])) {
            let parameters = this.container.getMethodParameters(type, instance, propertyKey);
            let paramInstances = parameters.map((type, index) => this.container.get(type));
            return instance[propertyKey](...paramInstances) as T;
        } else {
            throw new Error(`type: ${type} has no method ${propertyKey}.`)
        }
    }
}
