import { isObservable, isFunction } from '@tsdi/ioc';
import { PropBinding } from './PropBinding';


export class EventBinding<T = any> extends PropBinding<T> {

    bind(target: any): void {
        let $scope = this.source;
        let outEvent = target[this.binding.name];
        if (outEvent && isObservable(this.binding.type)) {
            outEvent.subsrcibe($event => {
                let result = this.provider.getAstResolver().resolve(this.expression, this.injector, this.getScope(), { target: target, $scope: $scope, $event: $event });
                if (isFunction(result)) {
                    result($event);
                }
            });
        }
    }
}
