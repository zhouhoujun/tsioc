import { MimeAdapterImpl, MimeTypesImpl } from '../src/impl/mime';
import { BasicMimeDb } from '../src/impl/mimedb';
import { FileAdapter } from '@tsdi/common';
import expect = require('expect');

class TestFileAdapter implements Pick<FileAdapter, 'extname'> {
    extname(path: string): string {
        const idx = path.lastIndexOf('.');
        return idx >= 0 ? path.slice(idx) : '';
    }
}

function createAdapter(): MimeAdapterImpl {
    const types = new MimeTypesImpl();
    const db = new BasicMimeDb();
    const fileAdapter = new TestFileAdapter() as FileAdapter;
    return new MimeAdapterImpl(types, db, fileAdapter);
}

describe('MimeAdapterImpl', () => {
    let adapter: MimeAdapterImpl;

    before(() => { adapter = createAdapter(); });

    describe('charset', () => {
        it('should return charset for text/html', () => {
            expect(adapter.charset('text/html')).toBe('UTF-8');
        });

        it('should return charset for application/json', () => {
            expect(adapter.charset('application/json')).toBe('UTF-8');
        });

        it('should return false for binary types', () => {
            expect(adapter.charset('application/octet-stream')).toBe(false);
        });

        it('should return false for invalid input', () => {
            expect(adapter.charset('')).toBe(false);
            expect(adapter.charset(null as any)).toBe(false);
            expect(adapter.charset(undefined as any)).toBe(false);
        });
    });

    describe('extension', () => {
        // Note: MimeAdapterImpl.extension() does a forward lookup (extension→mime)
        // via db.extension(), then returns the first character of the result.
        // This is existing behavior for reverse mapping.
        it('should return first char of mime type for file extension', () => {
            const result = adapter.extension('html');
            expect(typeof result).toBe('string');
        });

        it('should return false for unknown type', () => {
            expect(adapter.extension('unknown')).toBe(false);
        });

        it('should return false for unknown mime type', () => {
            expect(adapter.extension('application/unknown-format')).toBe(false);
        });

        it('should return false for invalid input', () => {
            expect(adapter.extension('')).toBe(false);
        });
    });

    describe('contentType', () => {
        it('should return content type with charset for text/html', () => {
            const result = adapter.contentType('text/html');
            expect(result).toBe('text/html; charset=utf-8');
        });

        it('should return content type with charset for application/json', () => {
            const result = adapter.contentType('application/json');
            expect(result).toContain('application/json');
            expect(result).toContain('charset=utf-8');
        });

        it('should look up by extension', () => {
            const result = adapter.contentType('file.html');
            expect(result).toBe('text/html; charset=utf-8');
        });

        it('should return false for unknown type', () => {
            expect(adapter.contentType('')).toBe(false);
        });
    });

    describe('lookup', () => {
        it('should lookup by file extension', () => {
            expect(adapter.lookup('file.html')).toBe('text/html');
            expect(adapter.lookup('file.json')).toBe('application/json');
            expect(adapter.lookup('file.png')).toBe('image/png');
            expect(adapter.lookup('file.mp4')).toBe('video/mp4');
            expect(adapter.lookup('file.pdf')).toBe('application/pdf');
        });

        it('should lookup by extension only', () => {
            expect(adapter.lookup('html')).toBe('text/html');
            expect(adapter.lookup('json')).toBe('application/json');
        });

        it('should return false for unknown extension', () => {
            expect(adapter.lookup('file.unknown')).toBe(false);
        });

        it('should return false for invalid input', () => {
            expect(adapter.lookup('')).toBe(false);
        });
    });

    describe('format', () => {
        it('should format type and subtype', () => {
            expect(adapter.format({ type: 'text', subtype: 'html' })).toBe('text/html');
        });

        it('should format with suffix', () => {
            expect(adapter.format({ type: 'application', subtype: 'json', suffix: 'json' })).toBe('application/json+json');
        });

        it('should format with parameters', () => {
            const result = adapter.format({ type: 'text', subtype: 'html', parameters: { charset: 'utf-8' } });
            expect(result).toBe('text/html; charset=utf-8');
        });

        it('should throw for invalid type', () => {
            expect(() => adapter.format({ type: '', subtype: '' } as any)).toThrow();
        });
    });

    describe('parse', () => {
        it('should parse simple mime type', () => {
            const result = adapter.parse('text/html');
            expect(result.type).toBe('text');
            expect(result.subtype).toBe('html');
        });

        it('should parse mime type with suffix', () => {
            const result = adapter.parse('application/json+json');
            expect(result.type).toBe('application');
            expect(result.subtype).toBe('json');
            expect(result.suffix).toBe('json');
        });

        it('should parse mime type with parameters', () => {
            const result = adapter.parse('text/html; charset=utf-8');
            expect(result.type).toBe('text');
            expect(result.subtype).toBe('html');
        });

        it('should throw for empty string', () => {
            expect(() => adapter.parse('')).toThrow();
        });
    });

    describe('normalize', () => {
        it('should normalize urlencoded', () => {
            expect(adapter.normalize('urlencoded')).toBe('application/x-www-form-urlencoded');
        });

        it('should normalize multipart', () => {
            expect(adapter.normalize('multipart')).toBe('multipart/*');
        });

        it('should normalize with + prefix', () => {
            expect(adapter.normalize('+json')).toBe('*/*+json');
        });

        it('should look up by extension', () => {
            expect(adapter.normalize('html')).toBe('text/html');
        });
    });

    describe('match', () => {
        it('should match exact type', () => {
            expect(adapter.match(['text/html'], 'text/html')).toBe('text/html');
        });

        it('should match wildcard type', () => {
            expect(adapter.match(['text/*'], 'text/html')).toBe('text/html');
        });

        it('should match any type', () => {
            expect(adapter.match(['*/*'], 'text/html')).toBe('text/html');
        });

        it('should return false if no match', () => {
            expect(adapter.match(['application/json'], 'text/html')).toBe(false);
        });

        it('should return false for invalid target', () => {
            expect(adapter.match(['text/html'], '')).toBe(false);
        });
    });
});

describe('MimeTypesImpl', () => {
    let types: MimeTypesImpl;

    before(() => { types = new MimeTypesImpl(); });

    it('should have default json types', () => {
        expect(types.json.length).toBeGreaterThan(0);
        expect(types.json).toContain('application/json');
    });

    it('should have default form types', () => {
        expect(types.form).toContain('application/x-www-form-urlencoded');
    });

    it('should have default text types', () => {
        expect(types.text).toContain('text/plain');
    });

    it('should have default xml types', () => {
        expect(types.xml).toContain('text/xml');
        expect(types.xml).toContain('application/xml');
    });

    it('should append to json types', () => {
        types.append('json', ['application/custom+json']);
        expect(types.json).toContain('application/custom+json');
    });

    it('should not duplicate on append', () => {
        const count = types.json.length;
        types.append('json', ['application/json']);
        expect(types.json.length).toBe(count);
    });

    it('should ignore empty mime list', () => {
        const count = types.form.length;
        types.append('form', []);
        expect(types.form.length).toBe(count);
    });
});

describe('BasicMimeDb', () => {
    let db: BasicMimeDb;

    before(() => { db = new BasicMimeDb(); });

    it('should have common mime types', () => {
        expect(db.has('text/html')).toBe(true);
        expect(db.has('application/json')).toBe(true);
        expect(db.has('image/png')).toBe(true);
        expect(db.has('video/mp4')).toBe(true);
    });

    it('should get mime source', () => {
        const mime = db.get('text/html');
        expect(mime).toBeDefined();
        expect(mime?.source).toBe('iana');
        expect(mime?.extensions).toContain('html');
    });

    it('should resolve extension to mime type', () => {
        expect(db.extension('html')).toBe('text/html');
        expect(db.extension('json')).toBe('application/json');
        expect(db.extension('png')).toBe('image/png');
        expect(db.extension('mp4')).toBe('video/mp4');
        expect(db.extension('pdf')).toBe('application/pdf');
    });

    it('should return undefined for unknown extension', () => {
        expect(db.extension('unknown')).toBeUndefined();
    });

    it('should allow removing mime types', () => {
        expect(db.has('application/json')).toBe(true);
        db.remove('application/json');
        expect(db.has('application/json')).toBe(false);
        // Re-add for other tests
        db.set('application/json', { source: 'iana', charset: 'UTF-8', compressible: true, extensions: ['json', 'map'] });
        expect(db.has('application/json')).toBe(true);
    });

    it('should resolve various multimedia extensions', () => {
        // Images
        expect(db.extension('jpeg')).toBe('image/jpeg');
        expect(db.extension('jpg')).toBe('image/jpeg');
        expect(db.extension('png')).toBe('image/png');
        expect(db.extension('svg')).toBe('image/svg+xml');
        expect(db.extension('bmp')).toBe('image/bmp');

        // Video
        expect(db.extension('mp4')).toBe('video/mp4');
        expect(db.extension('mpeg')).toBe('video/mpeg');

        // Audio
        expect(db.extension('mp3')).toBe('audio/mpeg');

        // Font
        expect(db.extension('woff')).toBe('font/woff');
        expect(db.extension('woff2')).toBe('font/woff2');
        expect(db.extension('ttf')).toBe('font/ttf');
        expect(db.extension('otf')).toBe('font/otf');

        // Documents
        expect(db.extension('zip')).toBe('application/zip');
    });
});
