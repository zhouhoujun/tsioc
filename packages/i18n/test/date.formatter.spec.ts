import { Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { DateFormatter } from '../src/formatters/date.formatter';

@Suite('DateFormatter')
export class DateFormatterSuite {
    formatter!: DateFormatter;
    testDate!: Date;

    @Test('should format short date')
    testFormatShort() {
        this.formatter = new DateFormatter();
        this.testDate = new Date(2024, 0, 15);
        const result = this.formatter.formatShort(this.testDate, 'en-US');
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
    }

    @Test('should format medium date')
    testFormatMedium() {
        this.formatter = new DateFormatter();
        this.testDate = new Date(2024, 0, 15);
        const result = this.formatter.formatMedium(this.testDate, 'en-US');
        expect(result).toBeDefined();
    }

    @Test('should format long date')
    testFormatLong() {
        this.formatter = new DateFormatter();
        this.testDate = new Date(2024, 0, 15);
        const result = this.formatter.formatLong(this.testDate, 'en-US');
        expect(result).toBeDefined();
    }

    @Test('should format time')
    testFormatTime() {
        this.formatter = new DateFormatter();
        this.testDate = new Date(2024, 0, 15, 10, 30);
        const result = this.formatter.formatTime(this.testDate, 'en-US');
        expect(result).toBeDefined();
    }

    @Test('should format datetime')
    testFormatDateTime() {
        this.formatter = new DateFormatter();
        this.testDate = new Date(2024, 0, 15, 10, 30);
        const result = this.formatter.formatDateTime(this.testDate, 'en-US');
        expect(result).toBeDefined();
    }

    @Test('should format with custom options')
    testFormatCustom() {
        this.formatter = new DateFormatter();
        this.testDate = new Date(2024, 0, 15);
        const result = this.formatter.format(this.testDate, 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        expect(result).toContain('2024');
    }
}