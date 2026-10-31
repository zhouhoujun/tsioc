/**
 * Lightweight renderer-neutral syntax tokenization for fenced code blocks.
 *
 * The UI cannot ship a tree-sitter grammar per language, so this module keeps
 * one shared tokenizer and per-language keyword/comment/string profiles. It is
 * deliberately line-oriented: enough fidelity for Markdown code blocks without
 * adding a native dependency to the renderers.
 */

export type CommonSyntaxTokenKind =
    | 'plain'
    | 'keyword'
    | 'string'
    | 'number'
    | 'comment'
    | 'property'
    | 'type'
    | 'constant'
    | 'variable'
    | 'tag'
    | 'attribute'
    | 'function';

export interface CommonSyntaxToken {
    text: string;
    kind: CommonSyntaxTokenKind;
}

export interface CommonSyntaxState {
    blockComment?: boolean;
}

interface CommonSyntaxProfile {
    keywords: Set<string>;
    types?: Set<string>;
    constants?: Set<string>;
    lineComments: string[];
    blockComment?: [string, string];
    strings: string[];
    tripleStrings?: string[];
    variablePrefixes?: string[];
    keyValue?: boolean;
    markup?: boolean;
    caseInsensitive?: boolean;
}

const words = (value: string): Set<string> => new Set(value.trim().split(/\s+/).filter(Boolean));

const JS_KEYWORDS = words(`
    async await break case catch class const continue debugger default delete do else export extends
    false finally for from function get if import in instanceof interface let new null of return set
    static super switch this throw true try type typeof undefined var void while with yield
    implements namespace private protected public readonly declare abstract as satisfies keyof infer
    never unknown any boolean number string symbol bigint object
`);
const PYTHON_KEYWORDS = words(`
    and as assert async await break case class continue def del elif else except finally for from
    global if import in is lambda match nonlocal not or pass raise return try while with yield
`);
const PYTHON_CONSTANTS = words('True False None NotImplemented Ellipsis self cls');
const GO_KEYWORDS = words(`
    break case chan const continue default defer else fallthrough for func go goto if import
    interface map package range return select struct switch type var
`);
const GO_CONSTANTS = words('true false nil iota');
const RUST_KEYWORDS = words(`
    as async await break const continue crate dyn else enum extern false fn for if impl in let loop
    match mod move mut pub ref return self Self static struct super trait true type unsafe use where
    while yield
`);
const RUST_CONSTANTS = words('None Some Ok Err');
const JAVA_KEYWORDS = words(`
    abstract assert break case catch class const continue default do else enum extends final finally
    for goto if implements import instanceof interface native new package private protected public
    return static strictfp super switch synchronized this throw throws transient try volatile while
    var record sealed permits non-sealed yield
`);
const JAVA_CONSTANTS = words('true false null');
const CSHARP_KEYWORDS = words(`
    abstract as async await base break case catch checked class const continue default delegate do
    else enum event explicit extern finally fixed for foreach goto if implicit in interface internal
    is lock namespace new operator out override params private protected public readonly record ref
    return sealed sizeof stackalloc static struct switch this throw try typeof unchecked unsafe
    using virtual volatile while yield
`);
const CSHARP_CONSTANTS = words('true false null');
const C_KEYWORDS = words(`
    auto break case char const continue default do double else enum extern float for goto if inline
    int long register restrict return short signed sizeof static struct switch typedef union unsigned
    void volatile while class namespace template typename using virtual public private protected
    new delete nullptr true false constexpr noexcept override final
`);
const KOTLIN_KEYWORDS = words(`
    as break class continue do else false for fun if in interface is null object package return
    super this throw true try typealias typeof val var when while by catch constructor delegate
    dynamic field file finally get import init param property receiver set setparam where actual
    abstract annotation companion const crossinline data enum expect external final infix inline
    inner internal lateinit noinline open operator out override private protected public reified
    sealed suspend tailrec vararg
`);
const SWIFT_KEYWORDS = words(`
    as associatedtype break case catch class continue default defer deinit do else enum extension
    fallthrough false fileprivate for func guard if import in init inout internal is let nil open
    operator private protocol public repeat rethrows return self Self static struct subscript super
    switch throw throws true try typealias var where while async await actor some any
`);
const RUBY_KEYWORDS = words(`
    alias and begin break case class def defined do else elsif end ensure false for if in module
    next nil not or redo rescue retry return self super then true undef unless until when while yield
`);
const PHP_KEYWORDS = words(`
    abstract and array as break callable case catch class clone const continue declare default do
    echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile eval exit extends
    final finally fn for foreach function global goto if implements include include_once instanceof
    insteadof interface isset list match namespace new or print private protected public readonly
    require require_once return static switch throw trait try unset use var while xor yield
`);
const PHP_CONSTANTS = words('true false null TRUE FALSE NULL');
const SQL_KEYWORDS = words(`
    add all alter and any as asc begin between by case check column commit constraint create cross
    database default delete desc distinct drop else end escape except exists foreign from full group
    having if in index inner insert intersect into is join key left like limit not null offset on or
    order outer primary references right rollback row select set table then to transaction union
    unique update values view when where with
`);
const SHELL_KEYWORDS = words(`
    break case cd continue do done echo elif else esac eval exec exit export false fi for function
    if in local read readonly return select set shift source then true unset until while
`);
const YAML_CONSTANTS = words('true false null yes no on off ~');
const TOML_CONSTANTS = words('true false');
const DOCKER_KEYWORDS = words(`
    FROM RUN CMD LABEL MAINTAINER EXPOSE ENV ADD COPY ENTRYPOINT VOLUME USER WORKDIR ARG ONBUILD
    STOPSIGNAL HEALTHCHECK SHELL AS
`);
const LUA_KEYWORDS = words(`
    and break do else elseif end false for function goto if in local nil not or repeat return then
    true until while
`);
const DART_KEYWORDS = words(`
    abstract as assert async await base break case catch class const continue covariant default
    deferred do dynamic else enum export extends extension external factory false final finally for
    Function get hide if implements import in interface is late library mixin new null on operator
    part required rethrow return sealed set show static super switch sync this throw true try
    typedef var void when while with yield
`);
const SCALA_KEYWORDS = words(`
    abstract case catch class def do else enum export extends false final finally for forSome given
    if implicit import lazy match new null object opaque open override package private protected
    return sealed super then this throw trait true try type val var while with yield
`);
const GROOVY_KEYWORDS = words(`
    abstract as assert break case catch class const continue def default do else enum extends final
    finally for goto if implements import in instanceof interface native new null package private
    protected public return static strictfp super switch synchronized this throw throws trait true
    try var void volatile while
`);
const PERL_KEYWORDS = words(`
    my our local use no require package sub return if elsif else unless while until for foreach do
    last next redo and or not eq ne lt gt le ge cmp x qw q qq m s tr y
`);
const POWERSHELL_KEYWORDS = words(`
    begin break catch class continue data define do dynamicparam else elseif end enum exit filter
    finally for foreach from function hidden if in param process return switch throw trap try until
    using var while workflow
`);

const ALIASES: Record<string, string> = {
    js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
    ts: 'typescript', mts: 'typescript', cts: 'typescript', tsx: 'typescript',
    py: 'python', python3: 'python',
    golang: 'go',
    rs: 'rust',
    kt: 'kotlin', kts: 'kotlin',
    cs: 'csharp', 'c#': 'csharp',
    c: 'c', h: 'c', cc: 'cpp', cxx: 'cpp', 'c++': 'cpp', hpp: 'cpp', hh: 'cpp',
    m: 'objectivec', mm: 'objectivec', objc: 'objectivec',
    rb: 'ruby',
    sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell', console: 'shell', shellsession: 'shell',
    yml: 'yaml', yaml: 'yaml',
    toml: 'toml', ini: 'toml', conf: 'toml',
    docker: 'dockerfile', containerfile: 'dockerfile',
    tf: 'hcl', hcl: 'hcl', terraform: 'hcl',
    ps1: 'powershell', pwsh: 'powershell',
    hs: 'haskell', ex: 'elixir', exs: 'elixir', erl: 'erlang', clj: 'clojure',
    pl: 'perl', pm: 'perl',
    sql: 'sql', postgres: 'sql', postgresql: 'sql', mysql: 'sql', sqlite: 'sql',
    html: 'markup', htm: 'markup', xml: 'markup', svg: 'markup', vue: 'markup',
    css: 'css', scss: 'css', sass: 'css', less: 'css',
    md: 'markdown', markdown: 'markdown',
    make: 'makefile', mk: 'makefile'
};

function createProfile(language: string): CommonSyntaxProfile {
    switch (language) {
        case 'python':
            return { keywords: PYTHON_KEYWORDS, constants: PYTHON_CONSTANTS, lineComments: ['#'], strings: ['"', "'"], tripleStrings: ['"""', "'''"] };
        case 'go':
            return { keywords: GO_KEYWORDS, constants: GO_CONSTANTS, lineComments: ['//'], blockComment: ['/*', '*/'], strings: ['"', "'", '`'] };
        case 'rust':
            return { keywords: RUST_KEYWORDS, constants: RUST_CONSTANTS, lineComments: ['//'], blockComment: ['/*', '*/'], strings: ['"'], variablePrefixes: [] };
        case 'java':
            return { keywords: JAVA_KEYWORDS, constants: JAVA_CONSTANTS, lineComments: ['//'], blockComment: ['/*', '*/'], strings: ['"', "'"] };
        case 'csharp':
            return { keywords: CSHARP_KEYWORDS, constants: CSHARP_CONSTANTS, lineComments: ['//'], blockComment: ['/*', '*/'], strings: ['"', "'"] };
        case 'kotlin':
            return { keywords: KOTLIN_KEYWORDS, constants: words('true false null'), lineComments: ['//'], blockComment: ['/*', '*/'], strings: ['"', "'"] };
        case 'swift':
            return { keywords: SWIFT_KEYWORDS, lineComments: ['//'], blockComment: ['/*', '*/'], strings: ['"'] };
        case 'ruby':
            return { keywords: RUBY_KEYWORDS, lineComments: ['#'], strings: ['"', "'"], variablePrefixes: ['@', '$'] };
        case 'php':
            return { keywords: PHP_KEYWORDS, constants: PHP_CONSTANTS, lineComments: ['//', '#'], blockComment: ['/*', '*/'], strings: ['"', "'"], variablePrefixes: ['$'] };
        case 'sql':
            return { keywords: SQL_KEYWORDS, lineComments: ['--'], blockComment: ['/*', '*/'], strings: ["'", '"'], caseInsensitive: true };
        case 'shell':
            return { keywords: SHELL_KEYWORDS, lineComments: ['#'], strings: ['"', "'"], variablePrefixes: ['$'] };
        case 'yaml':
            return { keywords: YAML_CONSTANTS, constants: YAML_CONSTANTS, lineComments: ['#'], strings: ['"', "'"], keyValue: true };
        case 'toml':
            return { keywords: TOML_CONSTANTS, constants: TOML_CONSTANTS, lineComments: ['#'], strings: ['"', "'"], keyValue: true };
        case 'dockerfile':
            return { keywords: DOCKER_KEYWORDS, lineComments: ['#'], strings: ['"', "'"], variablePrefixes: ['$'], keyValue: true };
        case 'lua':
            return { keywords: LUA_KEYWORDS, lineComments: ['--'], blockComment: ['--[[', ']]'], strings: ['"', "'"] };
        case 'dart':
            return { keywords: DART_KEYWORDS, lineComments: ['//'], blockComment: ['/*', '*/'], strings: ['"', "'"] };
        case 'scala':
            return { keywords: SCALA_KEYWORDS, constants: words('true false null'), lineComments: ['//'], blockComment: ['/*', '*/'], strings: ['"', "'"] };
        case 'groovy':
            return { keywords: GROOVY_KEYWORDS, lineComments: ['//'], blockComment: ['/*', '*/'], strings: ['"', "'"] };
        case 'perl':
            return { keywords: PERL_KEYWORDS, lineComments: ['#'], strings: ['"', "'"], variablePrefixes: ['$', '@', '%'] };
        case 'powershell':
            return { keywords: POWERSHELL_KEYWORDS, lineComments: ['#'], strings: ['"', "'"], variablePrefixes: ['$'], caseInsensitive: true };
        case 'c':
        case 'cpp':
            return { keywords: C_KEYWORDS, lineComments: ['//'], blockComment: ['/*', '*/'], strings: ['"', "'"] };
        case 'markup':
            return { keywords: new Set<string>(), lineComments: [], blockComment: ['<!--', '-->'], strings: ['"', "'"], markup: true };
        case 'css':
            return { keywords: words('important media supports keyframes font-face import charset'), lineComments: [], blockComment: ['/*', '*/'], strings: ['"', "'"], keyValue: true, variablePrefixes: ['$', '@'] };
        case 'markdown':
            return { keywords: new Set<string>(), lineComments: [], strings: [] };
        case 'makefile':
            return { keywords: words('include define endef ifeq ifneq ifdef ifndef else endif export unexport override'), lineComments: ['#'], strings: ['"', "'"], keyValue: true, variablePrefixes: ['$'] };
        case 'javascript':
        case 'typescript':
        default:
            return { keywords: JS_KEYWORDS, constants: words('true false null undefined'), lineComments: ['//'], blockComment: ['/*', '*/'], strings: ['"', "'", '`'] };
    }
}

const PROFILE_CACHE = new Map<string, CommonSyntaxProfile>();

function profileFor(language: string): CommonSyntaxProfile {
    const cached = PROFILE_CACHE.get(language);
    if (cached) {
        return cached;
    }
    const profile = createProfile(language);
    if (profile.caseInsensitive) {
        const lower = (set?: Set<string>) => set ? new Set([...set].map(item => item.toLowerCase())) : undefined;
        profile.keywords = lower(profile.keywords)!;
        profile.constants = lower(profile.constants);
        profile.types = lower(profile.types);
    }
    PROFILE_CACHE.set(language, profile);
    return profile;
}

export function normalizeCommonCodeLanguage(language: string): string {
    const value = String(language || '').trim().toLowerCase().replace(/^language-/, '');
    return ALIASES[value] || value || 'javascript';
}


function isWordChar(value: string): boolean {
    return /[A-Za-z0-9_$]/.test(value);
}

class TokenSink {
    readonly tokens: CommonSyntaxToken[] = [];
    private plain = '';

    push(text: string, kind: CommonSyntaxTokenKind = 'plain'): void {
        if (!text) {
            return;
        }
        if (kind === 'plain') {
            this.plain += text;
            return;
        }
        this.flush();
        this.tokens.push({ text, kind });
    }

    finish(): CommonSyntaxToken[] {
        this.flush();
        return this.tokens.length ? this.tokens : [{ text: '', kind: 'plain' }];
    }

    private flush(): void {
        if (!this.plain) {
            return;
        }
        this.tokens.push({ text: this.plain, kind: 'plain' });
        this.plain = '';
    }
}

function tokenizeMarkupLine(source: string, state: CommonSyntaxState): CommonSyntaxToken[] {
    const sink = new TokenSink();
    let index = 0;
    while (index < source.length) {
        const rest = source.slice(index);

        if (state.blockComment) {
            const close = rest.indexOf('-->');
            if (close < 0) {
                sink.push(rest, 'comment');
                return sink.finish();
            }
            const end = close + 3;
            sink.push(rest.slice(0, end), 'comment');
            index += end;
            state.blockComment = false;
            continue;
        }
        if (rest.startsWith('<!--')) {
            const close = rest.indexOf('-->', 4);
            if (close < 0) {
                sink.push(rest, 'comment');
                state.blockComment = true;
                return sink.finish();
            }
            const end = close + 3;
            sink.push(rest.slice(0, end), 'comment');
            index += end;
            continue;
        }

        const tagMatch = /^<\/?([A-Za-z][\w:.-]*)/.exec(rest);
        if (tagMatch) {
            const prefix = rest.startsWith('</') ? '</' : '<';
            sink.push(prefix, 'comment');
            sink.push(tagMatch[1], 'tag');
            index += prefix.length + tagMatch[1].length;
            continue;
        }

        const attrMatch = /^([A-Za-z_:][\w:.-]*)(?=\s*=)/.exec(rest);
        if (attrMatch) {
            sink.push(attrMatch[1], 'attribute');
            index += attrMatch[1].length;
            continue;
        }

        const stringMatch = /^"[^"]*"|^'[^']*'/.exec(rest);
        if (stringMatch) {
            sink.push(stringMatch[0], 'string');
            index += stringMatch[0].length;
            continue;
        }

        sink.push(source[index]);
        index += 1;
    }
    return sink.finish();
}

/**
 * Tokenize one line of source code into renderer-neutral spans.
 *
 * Callers keep the `state` object between lines so block comments and other
 * multi-line constructs stay highlighted across a fenced code block.
 */
export function tokenizeCommonCodeLine(
    line: string,
    language: string,
    state: CommonSyntaxState = {}
): CommonSyntaxToken[] {
    const profile = profileFor(normalizeCommonCodeLanguage(language));
    const source = String(line || '');
    if (profile.markup) {
        return tokenizeMarkupLine(source, state);
    }

    const sink = new TokenSink();
    let index = 0;
    while (index < source.length) {
        const rest = source.slice(index);

        if (state.blockComment && profile.blockComment) {
            const close = rest.indexOf(profile.blockComment[1]);
            if (close < 0) {
                sink.push(rest, 'comment');
                return sink.finish();
            }
            const end = close + profile.blockComment[1].length;
            sink.push(rest.slice(0, end), 'comment');
            index += end;
            state.blockComment = false;
            continue;
        }

        const lineComment = profile.lineComments.find(marker => rest.startsWith(marker));
        if (lineComment && (lineComment !== '#' || index === 0 || !isWordChar(source[index - 1]))) {
            sink.push(rest, 'comment');
            break;
        }

        if (profile.blockComment && rest.startsWith(profile.blockComment[0])) {
            const close = rest.indexOf(profile.blockComment[1], profile.blockComment[0].length);
            if (close < 0) {
                sink.push(rest, 'comment');
                state.blockComment = true;
                break;
            }
            const end = close + profile.blockComment[1].length;
            sink.push(rest.slice(0, end), 'comment');
            index += end;
            continue;
        }

        const triple = profile.tripleStrings?.find(marker => rest.startsWith(marker));
        if (triple) {
            const close = rest.indexOf(triple, triple.length);
            if (close < 0) {
                sink.push(rest, 'string');
                break;
            }
            const end = close + triple.length;
            sink.push(rest.slice(0, end), 'string');
            index += end;
            continue;
        }

        const char = source[index];
        if (profile.strings.includes(char)) {
            let end = index + 1;
            while (end < source.length) {
                if (source[end] === '\\') {
                    end += 2;
                    continue;
                }
                if (source[end] === char) {
                    end += 1;
                    break;
                }
                end += 1;
            }
            const token = source.slice(index, end);
            const remaining = source.slice(end);
            sink.push(token, profile.keyValue && /^\s*:/.test(remaining) ? 'property' : 'string');
            index = end;
            continue;
        }

        const variablePrefix = profile.variablePrefixes?.find(prefix => rest.startsWith(prefix));
        if (variablePrefix) {
            const variableMatch = new RegExp(`^\\${variablePrefix}[A-Za-z_][A-Za-z0-9_]*`).exec(rest);
            if (variableMatch) {
                sink.push(variableMatch[0], 'variable');
                index += variableMatch[0].length;
                continue;
            }
            if (variablePrefix === '$' && rest.startsWith('${')) {
                const close = rest.indexOf('}');
                const end = close < 0 ? rest.length : close + 1;
                sink.push(rest.slice(0, end), 'variable');
                index += end;
                continue;
            }
        }

        const numberMatch = /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(rest);
        if (numberMatch) {
            sink.push(numberMatch[0], 'number');
            index += numberMatch[0].length;
            continue;
        }

        const decoratorMatch = /^@[A-Za-z_][A-Za-z0-9_.]*/.exec(rest);
        if (decoratorMatch && profile.variablePrefixes === undefined) {
            sink.push(decoratorMatch[0], 'variable');
            index += decoratorMatch[0].length;
            continue;
        }

        const identifierMatch = /^[A-Za-z_$][A-Za-z0-9_$-]*/.exec(rest);
        if (identifierMatch) {
            const token = identifierMatch[0];
            const key = profile.caseInsensitive ? token.toLowerCase() : token;
            const remaining = source.slice(index + token.length);
            const followedByCall = /^\s*\(/.test(remaining);
            const followedByColon = profile.keyValue && /^\s*:/.test(remaining);
            if (profile.keywords.has(key)) {
                sink.push(token, 'keyword');
            } else if (profile.constants?.has(key)) {
                sink.push(token, 'constant');
            } else if (profile.types?.has(key)) {
                sink.push(token, 'type');
            } else if (followedByColon) {
                sink.push(token, 'property');
            } else if (followedByCall) {
                sink.push(token, 'function');
            } else {
                sink.push(token);
            }
            index += token.length;
            continue;
        }

        sink.push(char);
        index += 1;
    }

    return sink.finish();
}
