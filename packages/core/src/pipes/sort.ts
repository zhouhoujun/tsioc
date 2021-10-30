import { isString } from '@tsdi/ioc';
import { Pipe } from '../metadata/decor';
import { PipeTransform } from './pipe';

/**
 * sort pipe
 * 
 * @example
 * 
 * list | sort: 'desc' :'id'
 * list | sort: 'desc'
 * list | sort: { order:'desc'}
 * 
 * list | sort: {sort: 'id' order:'desc'}
 * 
 */
 @Pipe({
    name: 'sort'
})
export class SortPipe implements PipeTransform {
    transform(value: any[], option?: 'asc' | 'desc' | { sort: string, order: 'asc' | 'desc' }, orderby?: string): any {
        if (!value || value.length < 1) return [];
        const { sort, order } = (isString(option)? { order: option, sort: orderby } : option) as { sort: string, order: 'asc' | 'desc' };
        let type = sort ? typeof value[0]?.[sort] : typeof value[0];
        if (sort && type === 'undefined') {
            value.some(i => {
                if (i[sort] == null) return false;
                type = typeof i[sort];
                if (type === 'undefined') {
                    return false;
                }
                return type;
            });
        }

        if (type === 'string') {
            return value.sort((a, b) => {
                let x: string = sort ? a[sort] : a;
                let y: string = sort ? b[sort] : b;
                return this.compare(x?.toLowerCase() ?? '', y?.toLowerCase() ?? '', order);
            });
        }
        return value.sort((a, b) => {
            let x = sort ? a[sort] : a;
            let y = sort ? b[sort] : b;
            return this.compare(x, y, order);
        });
    }

    protected compare(x: any, y: any,  order?: 'asc' | 'desc' ) {
        if (x < y) { return order === 'desc' ? 1 : -1; }
        if (x > y) { return order === 'desc' ? -1 : 1; }
        return 0;
    }
}

