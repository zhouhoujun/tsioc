import { isDate, isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata/decor';
import { invalidPipeArgumentError } from '../err';
import { PipeTransform } from '../pipe';

/**
 * date format pipe.
 */
@Pipe('date')
export class DatePipe implements PipeTransform<Date> {

    transform(value: any, ...args: any[]): Date {
        let date: Date | null = null;
        if (isString(value) || isNumber(value)) {
            try {
                date = new Date(value);
            } catch {
                throw invalidPipeArgumentError(this, value);
            }
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
