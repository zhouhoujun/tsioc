import { isObservable, isFunction } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { DataBinding } from './DataBinding';
import { IBinding } from './IPropertyBindingReflect';
import { AstResolver } from '../AstResolver';


export class EventBinding<T = any> extends DataBinding<T> {

    constructor(protected container: IContainer, public source: any, public binding: IBinding, public expression: string) {
        super(container, source, '', binding)
    }

    bind(target: any): void {
        let $scope = this.getScope();
        let outEvent = target[this.binding.name];
        if (outEvent && isObservable(this.binding.type)) {
            outEvent.subsrcibe($event => {
                let result = this.container.getInstance(AstResolver).resolve(this.expression, { target: target, $scope: $scope, $event: $event });
                if (isFunction(result)) {
                    result($event);
                }
            });
        }
    }
}
