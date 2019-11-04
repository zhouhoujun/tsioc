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

        // let scopeFiled = this.getScopeField();
        // let scope = this.getValue(this.getScope(), /\./.test(this.prop) ? this.prop.substring(0, this.prop.lastIndexOf('.')) : '');

        let field = this.binding.name;
        this.getExprssionFileds().forEach(f => {
            observe.onPropertyChange(this.source, f, (value, oldVal) => {
                target[field] = this.getExressionValue();
            });
        });

        // observe.onPropertyChange(scope, scopeFiled, (value, oldVal) => {
        //     if (isBaseValue(value)) {
        //         let type = this.container.getTokenProvider(this.binding.provider) || this.binding.type;
        //         if (type !== lang.getClass(value)) {
        //             value = this.container.getInstance(BaseTypeParser).parse(type, value);
        //         }
        //     }
        //     target[this.binding.name] = value;
        // });

        // observe.onPropertyChange(target, field, (value, oldVal) => {
        //     scope[scopeFiled] = value;
        // });

        target[field] = this.getExressionValue();

    }
}
