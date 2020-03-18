import { lang } from '@tsdi/ioc';
import { observe } from './onChange';
import { ParseBinding } from './ParseBinding';
import { pathCkExp } from './exps';

/**
 * two way binding.
 *
 * @export
 * @class TwoWayBinding
 * @extends {ParseBinding<T>}
 * @template T
 */
export class TwoWayBinding<T> extends ParseBinding<T> {

    bind(target: any, initVal?: any): T {
        if (!target) {
            return;
        }

        let field = this.binding.name;
        let fields = this.getFileds();
        fields.forEach(f => {
            this.bindTagChange(f, target);
        });

        if (fields.length === 1) {
            let fd = lang.first(fields);
            let scopeExp = pathCkExp.test(fd) ? fd.substring(0, fd.lastIndexOf('.')) : '';
            let scopeParser = this.provider.getAstResolver().parse(scopeExp, this.injector);
            let scopeFile = pathCkExp.test(fd) ? fd.substring(fd.lastIndexOf('.') + 1) : fd;
            observe.onPropertyChange(target, field, (value, oldVal) => {
                let scope = scopeParser ? scopeParser(this.getScope()) : this.source;
                scope[scopeFile] = value;
            });
        }

        target[field] = initVal ?? this.resolveExression();
    }
}
