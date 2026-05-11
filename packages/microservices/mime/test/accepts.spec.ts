import { AcceptsPriorityImpl } from '../src/impl/accepts';
import { MimeAdapterImpl, MimeTypesImpl } from '../src/impl/mime';
import { BasicMimeDb } from '../src/impl/mimedb';
import { HeaderAdapter, Incoming, MimeAdapter, FileAdapter } from '@tsdi/common';
import expect = require('expect');

class TestHeaderAdapter implements Pick<HeaderAdapter, 'getAccept' | 'getAcceptEncoding' | 'getAcceptCharset' | 'getAcceptLanguage'> {
    private headers: Record<string, string> = {};

    setHeader(name: string, value: string) { this.headers[name.toLowerCase()] = value; }

    getAccept(_incoming: Incoming): string | undefined { return this.headers['accept']; }
    getAcceptEncoding(_incoming: Incoming): string | undefined { return this.headers['accept-encoding']; }
    getAcceptCharset(_incoming: Incoming): string | undefined { return this.headers['accept-charset']; }
    getAcceptLanguage(_incoming: Incoming): string | undefined { return this.headers['accept-language']; }
}

class TestFileAdapter implements Pick<FileAdapter, 'extname'> {
    extname(path: string): string {
        const idx = path.lastIndexOf('.');
        return idx >= 0 ? path.slice(idx) : '';
    }
}

function createAccepts(): { accepts: AcceptsPriorityImpl; headerAdapter: TestHeaderAdapter; mimeAdapter: MimeAdapter; incoming: Incoming } {
    const accepts = new AcceptsPriorityImpl();
    const headerAdapter = new TestHeaderAdapter();
    const types = new MimeTypesImpl();
    const db = new BasicMimeDb();
    const fileAdapter = new TestFileAdapter() as FileAdapter;
    const mimeAdapter = new MimeAdapterImpl(types, db, fileAdapter) as unknown as MimeAdapter;
    const incoming = {} as Incoming;
    return { accepts, headerAdapter, mimeAdapter, incoming };
}

describe('AcceptsPriorityImpl', () => {
    describe('accepts media types', () => {
        it('should accept text/html when Accept header is text/html', () => {
            const { accepts, headerAdapter, mimeAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept', 'text/html');
            const result = accepts.accepts(incoming, headerAdapter as unknown as HeaderAdapter, mimeAdapter, 'text/html');
            expect(result).toBe('text/html');
        });

        it('should accept json when Accept header is application/json', () => {
            const { accepts, headerAdapter, mimeAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept', 'application/json');
            const result = accepts.accepts(incoming, headerAdapter as unknown as HeaderAdapter, mimeAdapter, 'application/json');
            expect(result).toBe('application/json');
        });

        it('should prefer higher quality type', () => {
            const { accepts, headerAdapter, mimeAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept', 'text/html;q=0.5, application/json');
            const result = accepts.accepts(incoming, headerAdapter as unknown as HeaderAdapter, mimeAdapter, 'text/html', 'application/json');
            expect(result).toBe('application/json');
        });

        it('should accept wildcard', () => {
            const { accepts, headerAdapter, mimeAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept', '*/*');
            const result = accepts.accepts(incoming, headerAdapter as unknown as HeaderAdapter, mimeAdapter, 'application/json');
            expect(result).toBe('application/json');
        });

        it('should return false for non-acceptable type', () => {
            const { accepts, headerAdapter, mimeAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept', 'text/plain');
            const result = accepts.accepts(incoming, headerAdapter as unknown as HeaderAdapter, mimeAdapter, 'application/json');
            expect(result).toBe(false);
        });

        it('should accept by extension lookup', () => {
            const { accepts, headerAdapter, mimeAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept', 'application/json');
            const result = accepts.accepts(incoming, headerAdapter as unknown as HeaderAdapter, mimeAdapter, 'json');
            expect(result).toBe('application/json');
        });
    });

    describe('acceptsEncodings', () => {
        it('should accept gzip encoding', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-encoding', 'gzip, deflate');
            const result = accepts.acceptsEncodings(incoming, headerAdapter as unknown as HeaderAdapter, 'gzip');
            expect(result).toBe('gzip');
        });

        it('should prefer brotli over gzip', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-encoding', 'br, gzip');
            const result = accepts.acceptsEncodings(incoming, headerAdapter as unknown as HeaderAdapter, 'gzip', 'br');
            expect(result).toBe('br');
        });

        it('should return false for unsupported encoding', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-encoding', 'gzip');
            const result = accepts.acceptsEncodings(incoming, headerAdapter as unknown as HeaderAdapter, 'br');
            expect(result).toBe(false);
        });

        it('should include identity when no encoding specified', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-encoding', '*');
            const result = accepts.acceptsEncodings(incoming, headerAdapter as unknown as HeaderAdapter, 'gzip', 'identity');
            expect(typeof result).toBe('string');
        });
    });

    describe('acceptsCharsets', () => {
        it('should accept utf-8 charset', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-charset', 'utf-8, iso-8859-1');
            const result = accepts.acceptsCharsets(incoming, headerAdapter as unknown as HeaderAdapter, 'utf-8');
            expect(result).toBe('utf-8');
        });

        it('should prefer higher quality charset', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-charset', 'iso-8859-1;q=0.5, utf-8');
            const result = accepts.acceptsCharsets(incoming, headerAdapter as unknown as HeaderAdapter, 'utf-8', 'iso-8859-1');
            expect(result).toBe('utf-8');
        });
    });

    describe('acceptsLanguages', () => {
        it('should accept simple language', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-language', 'en');
            const result = accepts.acceptsLanguages(incoming, headerAdapter as unknown as HeaderAdapter, 'en');
            expect(result).toBe('en');
        });

        it('should prefer higher quality language', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-language', 'en;q=0.5, zh');
            const result = accepts.acceptsLanguages(incoming, headerAdapter as unknown as HeaderAdapter, 'en', 'zh');
            expect(result).toBe('zh');
        });

        it('should match language with region', () => {
            const { accepts, headerAdapter, incoming } = createAccepts();
            headerAdapter.setHeader('accept-language', 'en-US');
            const result = accepts.acceptsLanguages(incoming, headerAdapter as unknown as HeaderAdapter, 'en');
            expect(result).toBe('en');
        });
    });

    describe('priority', () => {
        it('should sort media types by quality', () => {
            const accepts = new AcceptsPriorityImpl();
            const result = accepts.priority('text/html;q=0.8, application/json', ['text/html', 'application/json'], 'media');
            expect(result[0]).toBe('application/json');
            expect(result[1]).toBe('text/html');
        });

        it('should sort languages by quality', () => {
            const accepts = new AcceptsPriorityImpl();
            const result = accepts.priority('en;q=0.3, fr;q=0.9, de', ['en', 'fr', 'de'], 'lang');
            expect(result[0]).toBe('de');
        });

        it('should sort encodings by quality', () => {
            const accepts = new AcceptsPriorityImpl();
            const result = accepts.priority('gzip;q=0.5, br', ['gzip', 'br'], 'encodings');
            expect(result[0]).toBe('br');
        });

        it('should sort charsets by quality', () => {
            const accepts = new AcceptsPriorityImpl();
            const result = accepts.priority('utf-8;q=0.5, iso-8859-1', ['utf-8', 'iso-8859-1'], 'charsets');
            expect(result[0]).toBe('iso-8859-1');
        });
    });
});
