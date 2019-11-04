import { isBaseValue, lang } from '@tsdi/ioc';
import { BaseTypeParser } from '@tsdi/boot';
import { observe } from './onChange';
import { ParseBinding } from './ParseBinding';
import { wTestExp } from './DataBinding';

/**
 * two way binding.
 *
 * @export
 * @class TwoWayBinding
 * @extends {ParseBinding<T>}
 * @template T
 */
export class TwoWayBinding<T> extends ParseBinding<T> {

    bind(target: any, obj?: any): T {
        if (!target) {
            return;
        }

        if (obj) {
            obj[this.binding.name] = target;
        }

        let field = this.binding.name;
        this.getExprssionFileds().forEach(f => {
            observe.onPropertyChange(this.source, f, (value, oldVal) => {
                target[field] = this.resolveExression();
            });
        });

        observe.onPropertyChange(target, field, (value, oldVal) => {
            let func = this.getAstResolver()
                .resolve(`value => ${this.expression} = value`, this.source);
            if (func) {
                func(value);
            }
        });

        target[field] = this.resolveExression();

    }
}
