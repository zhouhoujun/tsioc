import { DataType, isDate, isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata/decor';
import { invalidPipeArgumentError } from '../err';
import { PipeTransform } from '../pipe';

/**
 * date format pipe.
 */
@Pipe('parseDate', DataType.Date)
export class DatePipe implements PipeTransform<Date> {

    transform(value: any, ...args: any[]): Date {
        let date: Date | null = null;
        if (isString(value) || isNumber(value)) {
            date = new Date(value);
        } else if (isDate(value)) {
            date = value;
        }

        if (isDate(value)) {
            return date as Date;
        } else {
            throw invalidPipeArgumentError(this, value);
        }
    }
}