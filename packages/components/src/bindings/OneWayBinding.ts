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

    bind(target: any, initVal?: any): T {
        if (!target) {
            return;
        }

        target[this.binding.name] = initVal ?? this.resolveExression();
        this.getFileds().forEach(field => {
            this.bindTagChange(field, target);
        });
    }
}


