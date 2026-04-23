import { Suite, Test, BeforeEach } from '@tsdi/unit';
import expect = require('expect');
import { MessageFormatter } from '../src/message';

@Suite('MessageFormatter')
export class MessageFormatterSuite {
    formatter!: MessageFormatter;

    @BeforeEach()
    setup() {
        this.formatter = new MessageFormatter();
    }

    @Test('should interpolate simple placeholders')
    testSimpleInterpolation() {
        const result = this.formatter.format('Hello {name}!', { name: 'World' }, 'en');
        expect(result).toBe('Hello World!');
    }

    @Test('should interpolate multiple placeholders')
    testMultipleInterpolation() {
        const result = this.formatter.format(
            '{greeting} {name}, you have {count} messages',
            { greeting: 'Hello', name: 'User', count: 5 },
            'en'
        );
        expect(result).toBe('Hello User, you have 5 messages');
    }

    @Test('should handle missing placeholders')
    testMissingPlaceholder() {
        const result = this.formatter.format('Hello {name}!', {}, 'en');
        expect(result).toBe('Hello {name}!');
    }

    @Test('should handle plural - one')
    testPluralOne() {
        const result = this.formatter.format(
            'You have {count, plural, one{# item} other{# items}}',
            { count: 1 },
            'en'
        );
        expect(result).toBe('You have 1 item');
    }

    @Test('should handle plural - other')
    testPluralOther() {
        const result = this.formatter.format(
            'You have {count, plural, one{# item} other{# items}}',
            { count: 5 },
            'en'
        );
        expect(result).toBe('You have 5 items');
    }

    @Test('should handle select - male')
    testSelectMale() {
        const result = this.formatter.format(
            '{gender, select, male{He} female{She} other{They}} likes this',
            { gender: 'male' },
            'en'
        );
        expect(result).toBe('He likes this');
    }

    @Test('should handle select - female')
    testSelectFemale() {
        const result = this.formatter.format(
            '{gender, select, male{He} female{She} other{They}} likes this',
            { gender: 'female' },
            'en'
        );
        expect(result).toBe('She likes this');
    }

    @Test('should handle select - other')
    testSelectOther() {
        const result = this.formatter.format(
            '{gender, select, male{He} female{She} other{They}} likes this',
            { gender: 'unknown' },
            'en'
        );
        expect(result).toBe('They likes this');
    }
}