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
export declare class SortPipe implements PipeTransform {
    transform(value: any[], option?: 'asc' | 'desc' | {
        sort: string;
        order: 'asc' | 'desc';
    }, orderby?: string): any;
    protected compare(x: any, y: any, order?: 'asc' | 'desc'): 0 | 1 | -1;
}
