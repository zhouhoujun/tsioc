import { observe } from './onChange';
import { ParseBinding } from './ParseBinding';


/**
 * one way binding
 *
 * @export
 * @class OneWayBinding
 * @extends {DataBinding<T>}
 * @template T
 */
export class OneWayBinding<T> extends ParseBinding<T> {

    bind(target: any, obj?: any): T {
        if (!target) {
            return;
        }

        if (obj) {
            obj[this.binding.name] = target;
        }

        target[this.binding.name] = this.getExressionValue();
        this.getExprssionFileds().forEach(name => {
            observe.onPropertyChange(this.source, name, (value, oldVal) => {
                target[this.binding.name] = this.getExressionValue();
            });
        });

    }
}


