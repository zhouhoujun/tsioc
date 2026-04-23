import { Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { NumberFormatter } from '../src/formatters/number.formatter';

@Suite('NumberFormatter')
export class NumberFormatterSuite {
    formatter!: NumberFormatter;

    @Test('should format number with locale')
    testFormatNumber() {
        this.formatter = new NumberFormatter();
        const result = this.formatter.format(1234567.89, 'en-US');
        expect(result).toContain('1,234,567');
    }

    @Test('should format integer')
    testFormatInteger() {
        this.formatter = new NumberFormatter();
        const result = this.formatter.formatInteger(1234.56, 'en-US');
        expect(result).toBeDefined();
        // Integer formatting removes decimal part
        expect(result).not.toContain('.56');
    }

    @Test('should format decimal')
    testFormatDecimal() {
        this.formatter = new NumberFormatter();
        const result = this.formatter.formatDecimal(1234.5, 'en-US', 2);
        expect(result).toContain('1,234.50');
    }

    @Test('should format percent')
    testFormatPercent() {
        this.formatter = new NumberFormatter();
        const result = this.formatter.formatPercent(0.5, 'en-US');
        expect(result).toContain('50');
    }

    @Test('should format Chinese number')
    testFormatChinese() {
        this.formatter = new NumberFormatter();
        const result = this.formatter.format(1234567.89, 'zh-CN');
        expect(result).toBeDefined();
    }
}