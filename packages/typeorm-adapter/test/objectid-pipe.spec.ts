import { Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { ParseObjectIdPipe } from '../src/objectid.pipe';

@Suite('ParseObjectIdPipe')
export class ParseObjectIdPipeTest {

    @Test()
    async shouldCreatePipeInstance() {
        const pipe = new ParseObjectIdPipe(String as any);
        expect(pipe).toBeDefined();
        expect(pipe).toBeInstanceOf(ParseObjectIdPipe);
    }

    @Test()
    async shouldTransformStringValue() {
        const pipe = new ParseObjectIdPipe(String as any);
        const result = pipe.transform('507f1f77bcf86cd799439011');
        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(String);
    }

    @Test()
    async shouldPassThroughInstanceOfType() {
        const pipe = new ParseObjectIdPipe(String as any);
        const value = new String('507f1f77bcf86cd799439011');
        const result = pipe.transform(value);
        expect(result).toBe(value);
    }

    @Test()
    async shouldThrowWhenTypeIsNull() {
        const pipe = new ParseObjectIdPipe(null as any);
        expect(() => pipe.transform('507f1f77bcf86cd799439011')).toThrow();
    }
}
