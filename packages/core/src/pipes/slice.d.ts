import { PipeTransform } from './pipe';
/**
 * slice pipe, for string or array.
 */
export declare class SlicePipe implements PipeTransform {
    transform(value: any, start: number, end?: number): any;
    private supports;
}
