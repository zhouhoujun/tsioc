import { isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata';
import { invalidPipeArgument, PipeTransform } from '../pipe';

/**
 * format times with unit us, ns, ms, s, min, h... 
 */
@Pipe('times')
export class TimeFormatPipe implements PipeTransform<string> {

    transform(ms: number, precise = 2): string {
        let total: number;
        if (isString(ms)) {
            try {
                total = parseFloat(ms)
            } catch {
                throw invalidPipeArgument(this, ms)
            }
        } else {
            total = ms;
        }
        if (!isNumber(ms)) {
            throw invalidPipeArgument(this, ms)
        }

        if (Number.isNaN(total)) {
            return '';
        }

        let unitTime = '';
        for (let i = 0; i < unitSize.length; i++) {
            if (total >= unitSize[i]) {
                unitTime = this.cleanZero((total / unitSize[i]).toFixed(precise)) + minimalDesc[i];
                break;
            }
        }
        return unitTime
    }

    protected cleanZero(num: string) {
        return num.replace(clrZReg, '');
    }
}

const clrZReg = /\.?0+$/;
const minimalDesc = ['h', 'min', 's', 'ms', 'μs', 'ns'];
const unitSize = [60 * 60 * 1e3, 60 * 1e3, 1e3, 1, 1e-3, 1e-6];
