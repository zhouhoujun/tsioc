import { isObservable, isFunction } from '@tsdi/ioc';
import { DataBinding } from './DataBinding';


export class EventBinding<T = any> extends DataBinding<T> {

    bind(target: any): void {
        let $scope = this.source;
        let outEvent = target[this.binding.name];
        if (outEvent && isObservable(this.binding.type)) {
            outEvent.subsrcibe($event => {
                let result = this.provider.getAstResolver().resolve(this.expression, this.injector, this.getEnvMap(), { target: target, $scope: $scope, $event: $event });
                if (isFunction(result)) {
                    result($event);
                }
            });
        }
    }
}
