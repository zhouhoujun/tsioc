import { AcceptsPriorityImpl } from '../src/impl/accepts';
import { MimeAdapterImpl, MimeTypesImpl } from '../src/impl/mime';
import { BasicMimeDb } from '../src/impl/mimedb';
import { Incoming, MimeAdapter, FileAdapter } from '@tsdi/common';
import expect = require('expect');

class TestHeaders {
    private headers: Record<string, string> = {};

    setHeader(name: string, value: string) { this.headers[name.toLowerCase()] = value; }
    getHeader(name: string): string | undefined { return this.headers[name.toLowerCase()]; }
}

class TestFileAdapter implements Pick<FileAdapter, 'extname'> {
    extname(path: string): string {
        const idx = path.lastIndexOf('.');
        return idx >= 0 ? path.slice(idx) : '';
    }
}

function createAccepts(): { accepts: AcceptsPriorityImpl; headerAdapter: TestHeaders; mimeAdapter: MimeAdapter; incoming: Incoming } {
    const accepts = new AcceptsPriorityImpl();
    const headerAdapter = new TestHeaders();
    const types = new MimeTypesImpl();
    const db = new BasicMimeDb();
    const fileAdapter = new TestFileAdapter() as FileAdapter;
    const mimeAdapter = new MimeAdapterImpl(types, db, fileAdapter) as unknown as MimeAdapter;
    const incoming = { getHeader: (name: string) => headerAdapter.getHeader(name) } as Incoming;
    return { accepts, headerAdapter, mimeAdapter, incoming };
}

describe('AcceptsPriorityImpl', () => {
    describe('accepts media types', () => {
        it('should accept text/html when Accept header is text/html', () => {
            const { accepts, headerAdapter, mimeAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept', 'text/html');
            const result = accepts.accepts(incoming, mimeAdapter, 'text/html');
            expect(result).toBe('text/html');
        });

        it('should accept application/json when Accept header is application/json', () => {
            const { accepts, headerAdapter, mimeAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept', 'application/json');
            const result = accepts.accepts(incoming, mimeAdapter, 'application/json');
            expect(result).toBe('application/json');
        });

        it('should choose the best match by q value', () => {
            const { accepts, headerAdapter, mimeAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept', 'text/html;q=0.5, application/json;q=0.9');
            const result = accepts.accepts(incoming, mimeAdapter, 'text/html', 'application/json');
            expect(result).toBe('application/json');
        });

        it('should return false when no types match', () => {
            const { accepts, headerAdapter, mimeAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept', 'text/plain');
            const result = accepts.accepts(incoming, mimeAdapter, 'application/json');
            expect(result).toBe(false);
        });

        it('should treat extension shortcuts through mime lookup', () => {
            const { accepts, headerAdapter, mimeAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept', 'application/json');
            const result = accepts.accepts(incoming, mimeAdapter, 'json');
            expect(result).toBe('application/json');
        });
    });

    describe('accepts encodings', () => {
        it('should accept gzip', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-encoding', 'gzip, deflate');
            const result = accepts.acceptsEncodings(incoming, 'gzip');
            expect(result).toBe('gzip');
        });

        it('should choose best encoding by q value', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-encoding', 'gzip;q=0.7, br;q=1');
            const result = accepts.acceptsEncodings(incoming, 'gzip', 'br');
            expect(result).toBe('br');
        });
    });

    describe('accepts charsets', () => {
        it('should accept utf-8', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-charset', 'utf-8, iso-8859-1');
            const result = accepts.acceptsCharsets(incoming, 'utf-8');
            expect(result).toBe('utf-8');
        });
    });

    describe('accepts languages', () => {
        it('should accept en', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-language', 'en, zh;q=0.8');
            const result = accepts.acceptsLanguages(incoming, 'en');
            expect(result).toBe('en');
        });

        it('should choose best language by q value', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-language', 'en;q=0.5, zh;q=0.9');
            const result = accepts.acceptsLanguages(incoming, 'en', 'zh');
            expect(result).toBe('zh');
        });
    });
});
