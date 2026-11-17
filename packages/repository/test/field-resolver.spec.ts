import { DBPropertyMetadata, parseDbtype, toPrimitType } from '../src';
import expect = require('expect');

interface RecordingPipe {
    name: string;
    calls: any[][];
    transform(value: any, ...args: any[]): any;
}

function pipe(name: string): RecordingPipe {
    const record: RecordingPipe = {
        name,
        calls: [],
        transform(value: any, ...args: any[]) {
            record.calls.push([value, ...args]);
            return { pipe: name, value };
        }
    };
    return record;
}

/** Minimal RunContext stub: `parseDbtype` only asks it for pipes by token. */
function context(pipes: Record<string, RecordingPipe>): any {
    return {
        get: (token: any) => pipes[token as string]
    };
}

function prop(props: Partial<DBPropertyMetadata>): DBPropertyMetadata {
    return { propertyKey: 'value', type: Number, ...props } as DBPropertyMetadata;
}

describe('parseDbtype pipe selection', () => {

    it('uses the generic pipe for a dbtype without a dedicated pipe', () => {
        const int = pipe('int');
        const result = parseDbtype('42', prop({ dbtype: 'int' }), context({ int }), Number);

        expect(result).toEqual({ pipe: 'int', value: '42' });
        expect(int.calls).toEqual([['42']]);
    });

    it('prefers a pipe registered for the concrete dbtype', () => {
        const int = pipe('int');
        const int8 = pipe('int8');
        const result = parseDbtype('42', prop({ dbtype: 'int8' }), context({ int, int8 }), Number);

        expect(result).toEqual({ pipe: 'int8', value: '42' });
        expect(int.calls.length).toBe(0);
    });

    it('falls back to the generic pipe when the concrete one is missing', () => {
        const int = pipe('int');
        const result = parseDbtype('42', prop({ dbtype: 'int8' }), context({ int }), Number);

        expect(result).toEqual({ pipe: 'int', value: '42' });
    });

    it('passes the column length to string pipes', () => {
        const stringPipe = pipe('string');
        parseDbtype('abc', prop({ dbtype: 'varchar', length: 50 }), context({ string: stringPipe }), String);

        expect(stringPipe.calls).toEqual([['abc', 50]]);
    });

    it('maps date-like dbtypes to the date pipe', () => {
        const date = pipe('date');
        const result = parseDbtype('2026-11-17', prop({ dbtype: 'date' }), context({ date }), Date);

        expect(result).toEqual({ pipe: 'date', value: '2026-11-17' });
    });

    it('maps boolean dbtypes to the boolean pipe', () => {
        const boolean = pipe('boolean');
        const result = parseDbtype(true, prop({ dbtype: 'boolean' }), context({ boolean }), Boolean);

        expect(result).toEqual({ pipe: 'boolean', value: true });
    });

    it('maps json dbtypes to the json pipe', () => {
        const json = pipe('json');
        const result = parseDbtype('{"a":1}', prop({ dbtype: 'json' }), context({ json }), Object);

        expect(result).toEqual({ pipe: 'json', value: '{"a":1}' });
    });

    it('maps uuid to a string pipe', () => {
        const stringPipe = pipe('string');
        const result = parseDbtype('abc', prop({ dbtype: 'uuid' }), context({ string: stringPipe }), String);

        expect(result).toEqual({ pipe: 'string', value: 'abc' });
    });

    it('throws a diagnostic error when no pipe is available', () => {
        expect(() => parseDbtype('42', prop({ dbtype: 'int', propertyKey: 'age' }), context({}), Number))
            .toThrow(/missing pipe to transform property age/);
    });

    it('throws for an unknown dbtype instead of silently passing the value through', () => {
        expect(() => parseDbtype('x', prop({ dbtype: 'not-a-dbtype', propertyKey: 'weird' }), context({ string: pipe('string') }), String))
            .toThrow(/missing pipe to transform property weird/);
    });

});

describe('toPrimitType mapping', () => {

    const cases: Array<[string, any]> = [
        ['int', Number],
        ['bigint', BigInt],
        ['varchar', String],
        ['text', String],
        ['boolean', Boolean],
        ['date', Date],
        ['datetime', Date],
        ['timestamp', Number],
        ['bytea', Buffer],
        ['json', Object],
        ['jsonb', Object],
        ['point', Array],
        ['simple-array', Array]
    ];

    for (const [dbtype, expected] of cases) {
        it(`maps ${dbtype} to ${expected.name}`, () => {
            expect(toPrimitType(dbtype)).toBe(expected);
        });
    }

    it('falls back to Object for unknown dbtypes', () => {
        expect(toPrimitType('not-a-dbtype')).toBe(Object);
    });

    /**
     * Table of dbtype -> generic pipe the resolver falls back to. It locks the
     * mapping (and its known quirks, e.g. `timestamp` using the int pipe) so a
     * refactor that changes a fallback is a visible test change.
     */
    const fallbacks: Array<[string, string, boolean]> = [
        ['bigint', 'bigint', false],
        ['float8', 'float', false],
        ['decimal', 'number', false],
        ['bit', 'boolean', false],
        ['bytea', 'buffer', true],
        ['longblob', 'blob', true],
        ['citext', 'string', true],
        ['timestamp', 'int', false],
        ['timestamptz', 'int', false],
        ['rowversion', 'string', false],
        ['hierarchyid', 'string', false],
        ['jsonb', 'json', true]
    ];

    for (const [dbtype, expectedPipe, passesLength] of fallbacks) {
        it(`maps ${dbtype} to the ${expectedPipe} pipe`, () => {
            const target = pipe(expectedPipe);
            parseDbtype('v', prop({ dbtype, length: 12 }), context({ [expectedPipe]: target }), String);

            expect(target.calls.length).toBe(1);
            expect(passesLength ? target.calls[0] : [target.calls[0][0]]).toEqual(passesLength ? ['v', 12] : ['v']);
        });
    }

    it('resolves every known dbtype without throwing', () => {
        // One generic pipe answers for every dbtype-specific lookup, so this
        // walks the whole mapping switch and would fail on a typo'd `case`
        // label or a dbtype that ends up without any pipe.
        const generic = pipe('generic');
        const anyContext = { get: () => generic } as any;
        const dbtypes = [
            'enum', 'simple-enum', 'tinyint', 'smallint', 'mediumint', 'int', 'integer', 'int2', 'int4',
            'int8', 'int32', 'long', 'int64', 'float', 'float4', 'float8', 'float64', 'double',
            'double precision', 'smallmoney', 'money', 'fixed', 'decimal', 'smalldecimal', 'dec', 'real',
            'numeric', 'number', 'bigint', 'smalldatetime', 'date', 'datetime', 'datetime2', 'datetimeoffset',
            'timetz', 'time', 'time with time zone', 'time without time zone', 'timestamptz', 'timestamp',
            'timestamp with time zone', 'timestamp without time zone', 'timestamp with local time zone',
            'rowversion', 'bool', 'boolean', 'bit', 'bit varying', 'varbit', 'tsvector', 'binary', 'varbinary',
            'bytes', 'bytea', 'tinyblob', 'blob', 'mediumblob', 'longblob', 'raw', 'long raw', 'bfile', 'clob',
            'nclob', 'image', 'uuid', 'uniqueidentifier', 'hierarchyid', 'sql_variant', 'rowid', 'urowid',
            'alphanum', 'character varying', 'varying character', 'char varying', 'nvarchar', 'national varchar',
            'character', 'native character', 'varchar', 'char', 'nchar', 'national char', 'varchar2', 'nvarchar2',
            'shorttext', 'string', 'tinytext', 'text', 'ntext', 'citext', 'longtext', 'interval year to month',
            'interval day to second', 'interval', 'year', 'month', 'day', 'hour', 'minute', 'second', 'set',
            'hstore', 'inet', 'inet4', 'inet6', 'cidr', 'macaddr', 'point', 'geometry', 'geography', 'lseg',
            'line', 'polygon', 'box', 'path', 'circle', 'linestring', 'multipoint', 'multilinestring',
            'multipolygon', 'st_point', 'st_geometry', 'geometrycollection', 'int4range', 'int8range',
            'numrange', 'daterange', 'tsrange', 'tstzrange', 'int4multirange', 'int8multirange',
            'nummultirange', 'datemultirange', 'tsmultirange', 'tstzmultirange', 'simple-array', 'array',
            'cube', 'ltree', 'xml', 'json', 'jsonb', 'simple-json'
        ];
        const unknown: string[] = [];
        for (const dbtype of dbtypes) {
            try {
                parseDbtype('v', prop({ dbtype }), anyContext, String);
            } catch {
                unknown.push(dbtype);
            }
        }
        expect(unknown).toEqual([]);
    });

});
