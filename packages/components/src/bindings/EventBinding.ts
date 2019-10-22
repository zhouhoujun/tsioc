import { isObservable } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { DataBinding } from './DataBinding';
import { IBinding } from './IPropertyBindingReflect';


export class EventBinding<T = any> extends DataBinding<T> {

    constructor(protected container: IContainer, public source: any, public binding: IBinding, public expression: string) {
        super(container, source, '', binding)
    }

    bind(target: any): void {
        let $scope = this.getScope();
        let outEvent = target[this.binding.name];
        if (outEvent && isObservable(this.binding.type)) {
            outEvent.subsrcibe($event => {
                // tslint:disable-next-line:no-eval
                eval(this.expression)
            });
        }
    }
}
