import { IContainer } from './IContainer';
import { IExecute } from './IExecute';
import { Type } from './Type';
import { isFunction } from 'util';


export class Execute implements IExecute {

    constructor(private container: IContainer) {

    }

    exec<T>(type: Type<any>, propertyKey: string | symbol, instance?: any): T {
        instance = instance || this.container.get(type);
        if (instance && isFunction(instance[propertyKey])) {
            let parameters = this.container.getMethodParameters(type, instance, propertyKey);
            console.log('parameters:', parameters);
            let paramInstances = parameters.map((type, index) => this.container.get(type));
            console.log('parameters instances:', paramInstances);
            return instance[propertyKey](...paramInstances) as T;
        } else {
            throw new Error(`type: ${type} has no method ${propertyKey}.`)
        }
    }

}
