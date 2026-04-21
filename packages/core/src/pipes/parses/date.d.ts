import { PipeTransform } from '../pipe';
/**
 * date parse pipe.
 */
export declare class DatePipe implements PipeTransform<Date> {
    transform(value: any, ...args: any[]): Date;
}
