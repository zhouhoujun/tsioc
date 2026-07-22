import { isNumber, isString } from '@tsdi/ioc';
import { Pipe } from '../../metadata';
import { invalidPipeArgument, PipeTransform } from '../pipe';

export function formatCompactNumber(value: number, precise = 1): string {
    const amount = Math.max(0, Number(value) || 0);
    if (amount < 1000) {
        return String(amount);
    }
    if (amount < 1000000) {
        return `${cleanTrailingZero((amount / 1000).toFixed(precise))}K`;
    }
    return `${cleanTrailingZero((amount / 1000000).toFixed(precise))}M`;
}

@Pipe('number-format')
export class NumberFormatPipe implements PipeTransform<string> {
    transform(value: any, precise = 1): string {
        let amount: number;
        if (isString(value)) {
            amount = Number.parseFloat(value);
        } else {
            amount = value;
        }
        if (!isNumber(amount)) {
            throw invalidPipeArgument(this, value);
        }
        if (Number.isNaN(amount)) {
            return '';
        }
        return formatCompactNumber(amount, precise);
    }
}

function cleanTrailingZero(value: string): string {
    return value.replace(/\.0+$/, '');
}
