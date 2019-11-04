import { isObservable, isFunction } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { DataBinding } from './DataBinding';
import { IBinding } from './IPropertyBindingReflect';
import { AstResolver } from '../AstResolver';


export class EventBinding<T = any> extends DataBinding<T> {

    constructor(protected container: IContainer, source: any, binding: IBinding,  expression: string) {
        super(container, source, binding, expression)
    }

    bind(target: any): void {
        let $scope = this.source;
        let outEvent = target[this.binding.name];
        if (outEvent && isObservable(this.binding.type)) {
            outEvent.subsrcibe($event => {
                let result = this.container.getInstance(AstResolver).resolve(this.expression,  { ...$scope, target: target, $scope: $scope, $event: $event });
                if (isFunction(result)) {
                    result($event);
                }
            });
        }
    }
}
