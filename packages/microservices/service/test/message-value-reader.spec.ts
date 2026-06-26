import expect = require('expect');
import { MessageAdapter } from '@tsdi/common';
import { ServiceMessageValueReader } from '../src';

describe('ServiceMessageValueReader', () => {
    it('reads scoped values through MessageAdapter', () => {
        class TestAdapter extends MessageAdapter<any, any> {
            get request() { return {}; }
            get response() { return {}; }
            protected onPayloadChange(payload: any): any { return payload; }
            setHeader(_name: string, _value: any) { return this; }
            removeHeader(_name: string) { return this; }
            protected onErrorChange(error: any): any { return error; }
            read(section: any, name?: string): any {
                return `${section}:${name ?? '*'}`;
            }
        }

        const reader = new ServiceMessageValueReader();
        const result = reader.read('id', new TestAdapter(), 'body');

        expect(result).toEqual({ success: true, value: 'body:id' });
    });
});
