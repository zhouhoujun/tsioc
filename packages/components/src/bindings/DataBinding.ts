/**
 * data binding.
 *
 * @export
 * @abstract
 * @class DataBinding
 * @template T
 */
export abstract class DataBinding<T = any> {

    constructor(public source: any, public propName: string) {
    }

    getScope() {
        return this.source;
    }

    getValue(obj, path: string) {
        if (!path) {
            return obj;
        }
        if (!obj) {
            return null;
        }
        let hasNsp = path.indexOf('.') > 1;
        if (hasNsp) {
            let idx = path.indexOf('.');
            let p = path.substring(0, idx);
            if (!p) {
                return obj;
            }
            p = /\?$/.test(p) ? p.substring(0, p.length - 1) : p;
            let pv = obj[p];
            if (!pv) {
                return null;
            }
            return this.getValue(pv, path.substring(idx + 1, path.length).toString());
        } else {
            return obj[path];
        }
    }

    getScopeField(): string {
        return /\./.test(this.propName) ? this.propName.substring(this.propName.lastIndexOf('.') + 1) : this.propName;
    }

    getSourceValue(): T {
        let source = this.getScope();
        if (source) {
            return this.getValue(this.source, this.propName);
        }
        return undefined;
    }

    abstract bind(target: any, prop: string): T;
}

/**
 * binding
 */
export type Binding<T> = string | DataBinding<T> | T;

