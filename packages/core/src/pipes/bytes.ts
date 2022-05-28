import { isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../metadata/decor';
import { invalidPipeArgumentError, PipeTransform } from './pipe';

/**
 * format bytes with unit b kb mb gb tb... 
 */
@Pipe('bytes')
export class BytesPipe implements PipeTransform<string> {

    transform(value: any, precise = 2): string {
        let size: number;
        if (isString(value)) {
            try {
                size = parseInt(value)
            } catch {
                throw invalidPipeArgumentError(this, value)
            }
        } else {
            size = value;
        }
        if (!isNumber(value)) {
            throw invalidPipeArgumentError(this, value)
        }

        if (Number.isNaN(size)) {
            return '';
        }

        let unit = '';
        for (let i = 0; i < bits.length; i++) {
            if (size >= bits[i]) {
                unit = this.cleanZero((size / bits[i]).toFixed(precise)) + bitUnits[i];
                break;
            }
        }
        return unit
    }

    protected cleanZero(num: string) {
        return num.replace(clrZReg, '');
    }
}

const clrZReg = /\.?0+$/;
const bits = [1024 * 1024 * 1024 * 1024, 1024 * 1024 * 1024, 1024 * 1024, 1024, 1];
const bitUnits = ['tb', 'gb', 'mb', 'kb', 'b'];