import { isObservable, isFunction } from '@tsdi/ioc';
import { DataBinding } from './DataBinding';
import { IBinding } from './IBinding';
import { AstResolver } from '../AstResolver';


export class EventBinding<T = any> extends DataBinding<T> {

    constructor(ast: AstResolver, source: any, binding: IBinding,  expression: string) {
        super(ast, source, binding, expression)
    }

    bind(target: any): void {
        let $scope = this.source;
        let outEvent = target[this.binding.name];
        if (outEvent && isObservable(this.binding.type)) {
            outEvent.subsrcibe($event => {
                let result = this.ast.resolve(this.expression,  { ...$scope, target: target, $scope: $scope, $event: $event });
                if (isFunction(result)) {
                    result($event);
                }
            });
        }
    }
}
