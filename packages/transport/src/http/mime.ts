import { Injectable, isString } from '@tsdi/ioc';
import { extname } from 'path';
import { MimeAdapter, MimeDb, SplitType } from '../mime';

@Injectable()
export class HttpMimeAdapter extends MimeAdapter {
    constructor(private db: MimeDb) {
        super();
    }

    charset(type: string): string | false {
        if (!type || !isString(type)) {
            return false;
        }

        // TODO: use media-typer
        let match = EXTRACT_REGEXP.exec(type);
        let mime = match && this.db.get(match[1].toLowerCase());

        if (mime && mime.charset) {
            return mime.charset;
        }

        // default text/* to utf-8
        if (match && TEXT_REGEXP.test(match[1])) {
            return 'UTF-8';
        }

        return false;
    }

    extension(extname: string): string | false {
        if (!extname || !isString(extname)) {
            return false;
        }
        let match = EXTRACT_REGEXP.exec(extname);
        // get extensions
        let exts = match && this.db.extension(match[1].toLowerCase());

        if (!exts || !exts.length) {
            return false;
        }

        return exts[0]
    }

    contentType(str: string): string | false {
        if (!str || !isString(str)) {
            return false;
        }

        let mime = str.indexOf('/') === -1
            ? this.lookup(str)
            : str;

        if (!mime) {
            return false;
        }

        if (mime.indexOf('charset') === -1) {
            let charset = this.charset(mime);
            if (charset) mime += '; charset=' + charset.toLowerCase();
        }

        return mime;
    }

    lookup(path: string): string | false {
        if (!path || typeof path !== 'string') {
            return false
        }

        // get the extension ("ext" or ".ext" or full path)
        let extension = extname('x.' + path)
            .toLowerCase()
            .substring(1);

        if (!extension) {
            return false;
        }

        return this.db.extension(extension) ?? false;
    }

    format(media: SplitType): string {
        if (!media || typeof media !== 'object') {
            throw new TypeError('argument obj is required')
        }

        let parameters = media.parameters
        let subtype = media.subtype
        let suffix = media.suffix
        let type = media.type

        if (!type || !typeNameRegExp.test(type)) {
            throw new TypeError('invalid type')
        }

        if (!subtype || !subtypeNameRegExp.test(subtype)) {
            throw new TypeError('invalid subtype')
        }

        // format as type/subtype
        let str = type + '/' + subtype

        // append +suffix
        if (suffix) {
            if (!typeNameRegExp.test(suffix)) {
                throw new TypeError('invalid suffix')
            }

            str += '+' + suffix
        }

        // append parameters
        if (parameters && typeof parameters === 'object') {
            let param
            let params = Object.keys(parameters).sort()

            for (let i = 0; i < params.length; i++) {
                param = params[i]

                if (!tokenRegExp.test(param)) {
                    throw new TypeError('invalid parameter name')
                }

                str += '; ' + param + '=' + this.qstring(parameters[param])
            }
        }

        return str
    }

    parse(mime: string): SplitType {
        if (!mime) {
            throw new TypeError('argument string is required');
        }

        if (typeof mime !== 'string') {
            throw new TypeError('argument string is required to be a string');
        }

        let index = mime.indexOf(';');
        let type = index !== -1
            ? mime.substring(0, index)
            : mime;

        let key
        let match
        let obj = this.splitType(type);
        let params: Record<string, any> = {};
        let value;

        paramRegExp.lastIndex = index;

        while (match = paramRegExp.exec(type)) {
            if (match.index !== index) {
                throw new TypeError('invalid parameter format');
            }

            index += match[0].length;
            key = match[1].toLowerCase();
            value = match[2];

            if (value[0] === '"') {
                // remove quotes and escapes
                value = value
                    .substring(1, value.length - 2)
                    .replace(qescRegExp, '$1');
            }

            params[key] = value;
        }

        if (index !== -1 && index !== type.length) {
            throw new TypeError('invalid parameter format')
        }

        obj.parameters = params;

        return obj;
    }

    normalize(type: string): string | false {
        if (!isString(type)) {
            // invalid type
            return false;
        }

        switch (type) {
            case 'urlencoded':
                return 'application/x-www-form-urlencoded'
            case 'multipart':
                return 'multipart/*'
        }

        if (type[0] === '+') {
            // "+json" -> "*/*+json" expando
            return '*/*' + type
        }

        return type.indexOf('/') === -1
            ? this.lookup(type)
            : type;
    }

    match(types: string[], target: string): string | false {
        let val = this.tryNormalizeType(target);
        if (!val) {
            return false;
        }
        if (!types || !types.length) return val;
        let type: string;
        if (types.some(t => {
            type = t;
            return this.mimeMatch(this.normalize(t), val!)
        })) {
            return type![0] === '+' || type!.indexOf('*') !== -1
                ? val
                : type!
        }
        return false;
    }

    private qstring(val: any): string {
        let str = String(val)

        // no need to quote tokens
        if (tokenRegExp.test(str)) {
            return str
        }

        if (str.length > 0 && !textRegExp.test(str)) {
            throw new TypeError('invalid parameter value')
        }

        return '"' + str.replace(quoteRegExp, '\\$1') + '"'
    }

    private splitType(str: string): SplitType {
        let match = typeRegExp.exec(str.toLowerCase())

        if (!match) {
            throw new TypeError('invalid media type')
        }

        let type = match[1];
        let subtype = match[2];
        let suffix;

        // suffix after last +
        let index = subtype.lastIndexOf('+')
        if (index !== -1) {
            suffix = subtype.substring(index + 1)
            subtype = subtype.substring(0, index)
        }

        return {
            type,
            subtype,
            suffix
        };
    }

    private tryNormalizeType(value: string) {
        if (!value) {
            return
        }

        try {
            return this.normalizeType(value)
        } catch (err) {
            return
        }
    }

    private mimeMatch(expected: string | false, actual: string) {
        // invalid type
        if (expected === false) {
            return false
        }

        // split types
        let actualParts = actual.split('/')
        let expectedParts = expected.split('/')

        // invalid format
        if (actualParts.length !== 2 || expectedParts.length !== 2) {
            return false
        }

        // validate type
        if (expectedParts[0] !== '*' && expectedParts[0] !== actualParts[0]) {
            return false
        }

        // validate suffix wildcard
        if (expectedParts[1].substring(0, 2) === '*+') {
            return expectedParts[1].length <= actualParts[1].length + 1 &&
                expectedParts[1].substring(1) === actualParts[1].substring(1 - expectedParts[1].length)
        }

        // validate subtype
        if (expectedParts[1] !== '*' && expectedParts[1] !== actualParts[1]) {
            return false
        }

        return true;
    }

    private normalizeType(value: string) {
        // parse the type
        let type = this.parse(value)

        // remove the parameters
        type.parameters = undefined

        // reformat it
        return this.format(type);
    }

}


const EXTRACT_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
const TEXT_REGEXP = /^text\//i;
/**
 * RegExp to match *( ";" parameter ) in RFC 2616 sec 3.7
 *
 * parameter     = token "=" ( token | quoted-string )
 * token         = 1*<any CHAR except CTLs or separators>
 * separators    = "(" | ")" | "<" | ">" | "@"
 *               | "," | ";" | ":" | "\" | <">
 *               | "/" | "[" | "]" | "?" | "="
 *               | "{" | "}" | SP | HT
 * quoted-string = ( <"> *(qdtext | quoted-pair ) <"> )
 * qdtext        = <any TEXT except <">>
 * quoted-pair   = "\" CHAR
 * CHAR          = <any US-ASCII character (octets 0 - 127)>
 * TEXT          = <any OCTET except CTLs, but including LWS>
 * LWS           = [CRLF] 1*( SP | HT )
 * CRLF          = CR LF
 * CR            = <US-ASCII CR, carriage return (13)>
 * LF            = <US-ASCII LF, linefeed (10)>
 * SP            = <US-ASCII SP, space (32)>
 * SHT           = <US-ASCII HT, horizontal-tab (9)>
 * CTL           = <any US-ASCII control character (octets 0 - 31) and DEL (127)>
 * OCTET         = <any 8-bit sequence of data>
 */
const paramRegExp = /; *([!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+) *= *("(?:[ !\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u0020-\u007e])*"|[!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+) */g;
const textRegExp = /^[\u0020-\u007e\u0080-\u00ff]+$/
const tokenRegExp = /^[!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+$/

/**
 * RegExp to match quoted-pair in RFC 2616
 *
 * quoted-pair = "\" CHAR
 * CHAR        = <any US-ASCII character (octets 0 - 127)>
 */
const qescRegExp = /\\([\u0000-\u007f])/g;

/**
 * RegExp to match chars that must be quoted-pair in RFC 2616
 */
const quoteRegExp = /([\\"])/g;

/**
 * RegExp to match type in RFC 6838
 *
 * type-name = restricted-name
 * subtype-name = restricted-name
 * restricted-name = restricted-name-first *126restricted-name-chars
 * restricted-name-first  = ALPHA / DIGIT
 * restricted-name-chars  = ALPHA / DIGIT / "!" / "#" /
 *                          "$" / "&" / "-" / "^" / "_"
 * restricted-name-chars =/ "." ; Characters before first dot always
 *                              ; specify a facet name
 * restricted-name-chars =/ "+" ; Characters after last plus always
 *                              ; specify a structured syntax suffix
 * ALPHA =  %x41-5A / %x61-7A   ; A-Z / a-z
 * DIGIT =  %x30-39             ; 0-9
 */
const subtypeNameRegExp = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.-]{0,126}$/
const typeNameRegExp = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}$/
const typeRegExp = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/;
