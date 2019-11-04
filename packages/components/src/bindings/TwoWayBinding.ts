import { observe } from './onChange';
import { ParseBinding } from './ParseBinding';
import { lang } from '@tsdi/ioc';

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

        let nav = this.expression.split('.');
        let scopeExp = nav.slice(0, nav.length - 1).join('.');
        let scopeFile = nav.length > 1 ? lang.last(nav) : nav[0];
        observe.onPropertyChange(target, field, (value, oldVal) => {
            let scope = nav.length > 1 ? this.getAstResolver().resolve(scopeExp, this.source) : this.source;
            scope[scopeFile] = value;
        });

        target[field] = this.resolveExression();

    }
}
