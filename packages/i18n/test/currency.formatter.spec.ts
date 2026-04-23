import { Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { CurrencyFormatter } from '../src/formatters/currency.formatter';

@Suite('CurrencyFormatter')
export class CurrencyFormatterSuite {
    formatter!: CurrencyFormatter;

    @Test('should format USD')
    testFormatUSD() {
        this.formatter = new CurrencyFormatter();
        const result = this.formatter.formatUSD(1234.56, 'en-US');
        expect(result).toContain('$');
        expect(result).toContain('1,234');
    }

    @Test('should format CNY')
    testFormatCNY() {
        this.formatter = new CurrencyFormatter();
        const result = this.formatter.formatCNY(1234.56, 'zh-CN');
        expect(result).toBeDefined();
    }

    @Test('should format EUR')
    testFormatEUR() {
        this.formatter = new CurrencyFormatter();
        const result = this.formatter.formatEUR(1234.56, 'de-DE');
        expect(result).toBeDefined();
    }

    @Test('should format JPY')
    testFormatJPY() {
        this.formatter = new CurrencyFormatter();
        const result = this.formatter.formatJPY(1234, 'ja-JP');
        expect(result).toBeDefined();
    }

    @Test('should format with custom currency')
    testFormatCustom() {
        this.formatter = new CurrencyFormatter();
        const result = this.formatter.format(1234.56, 'en-US', 'GBP');
        expect(result).toContain('1,234');
    }
}