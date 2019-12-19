import { lang } from '@tsdi/ioc';
import { observe } from './onChange';
import { pathCkExp } from './DataBinding';
import { ParseBinding } from './ParseBinding';

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
        let fields = this.getFileds();
        fields.forEach(f => {
            this.bindTagChange(f, target);
        });

        if (fields.length === 1) {
            let fd = lang.first(fields);
            let scopeExp = pathCkExp.test(fd) ? fd.substring(0, fd.lastIndexOf('.')) : '';
            let scopeFile = pathCkExp.test(fd) ? fd.substring(fd.lastIndexOf('.') + 1) : fd;
            observe.onPropertyChange(target, field, (value, oldVal) => {
                let scope = scopeExp ? this.getAstResolver().resolve(scopeExp, this.source) : this.source;
                scope[scopeFile] = value;
            });
        }

        target[field] = this.resolveExression();
    }
}
