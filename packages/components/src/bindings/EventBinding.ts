import { isObservable, isFunction, IInjector } from '@tsdi/ioc';
import { DataBinding } from './DataBinding';
import { IBinding } from './IBinding';


export class EventBinding<T = any> extends DataBinding<T> {

    constructor(injector: IInjector, source: any, binding: IBinding,  expression: string) {
        super(injector, source, binding, expression)
    }

    bind(target: any): void {
        let $scope = this.source;
        let outEvent = target[this.binding.name];
        if (outEvent && isObservable(this.binding.type)) {
            outEvent.subsrcibe($event => {
                let result = this.getAstResolver().resolve(this.expression,  { ...$scope, target: target, $scope: $scope, $event: $event });
                if (isFunction(result)) {
                    result($event);
                }
            });
        }
    }
}
