import { createFilter } from '@rollup/pluginutils';
import { Plugin } from 'rollup';
import { iocAnnotations, tsChkExp } from '../classAnnotations';


export interface AnnOptions {
    include?: string | string[];
    exclude?: string | string[];
}

/**
 * rollup class Annotations for ioc.
 *
 * @export
 * @param {*} options
 * @returns
 */
export function classAnnotations(options?: AnnOptions): Plugin {
    options = options || {};
    const filter = createFilter(options.include, options.exclude);
    return {
        name: 'classAnnations',
        transform(code, id) {
            if (!filter(id) && !tsChkExp.test(id)) {
                return null
            }
            return new Promise((resolve) => {
                try {
                    resolve({
                        code: iocAnnotations(code),
                        map: null
                    });
                } catch (err: any) {
                    // istanbul ignore else
                    if ('position' in err && this.error) {
                        this.error(err.message, err.position)
                    } else {
                        throw err
                    }
                }
            });
        },
    }
}