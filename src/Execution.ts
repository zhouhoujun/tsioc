import { IContainer } from './IContainer';
import { IExecution } from './IExecution';
import { Type } from './Type';
import { isFunction } from 'util';


export class Execution implements IExecution {


    constructor(private container: IContainer) {

    }

    async exec<T>(type: Type<any>, propertyKey: string | symbol, instance?: any): Promise<T> {
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
