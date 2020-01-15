import { isObservable, isFunction } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { DataBinding } from './DataBinding';
import { IBinding } from './IBinding';


export class EventBinding<T = any> extends DataBinding<T> {

    constructor(injector: ICoreInjector, source: any, binding: IBinding,  expression: string) {
        super(injector, source, binding, expression)
    }

    bind(target: any): void {
        let $scope = this.source;
        let outEvent = target[this.binding.name];
        if (outEvent && isObservable(this.binding.type)) {
            outEvent.subsrcibe($event => {
                let result = this.getAst().resolve(this.expression,  { ...$scope, target: target, $scope: $scope, $event: $event });
                if (isFunction(result)) {
                    result($event);
                }
            });
        }
    }
}
