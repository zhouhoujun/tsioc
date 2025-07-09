import { Injectable, isArray } from '@tsdi/ioc';
import { Pattern, PatternFormatter, patternToPath, normalize } from '@tsdi/common';
// import { DefaultRouteMatcher } from '@tsdi/endpoints';

@Injectable()
export class KafkaPatternFormatter extends PatternFormatter {
    format(pattern: Pattern): string {
        return normalize(patternToPath(pattern, '.', '-')).replace(/\//g, '.')
    }

    parseRegExp(pattern: string): RegExp | null {
        if (!pattern$.test(pattern)) return null;
        let $exp = this.replaceTopic(pattern);
        // if (params) {
        //     let opts = { match: tval$, start: 2, end: 1, subs };
        //     $exp = this.replaceWithParams($exp, params, opts);
        //     opts = { ...opts, match: rest$, start: 1, end: 0 };
        //     $exp = this.replaceWithParams($exp, params, opts);
        //     subs = opts.subs
        // } else {
        $exp = $exp.replace(tval$, tplPth)
            .replace(rest$, tplPth)
        // }

        return new RegExp('^' + $exp + '$');
    }

    protected replaceTopic(route: string) {
        return route.replace(doat$, doat)
            .replace(sg$, sg)
            .replace(mtlPth$, mtlPth)
            .replace(mtlall$, mtlall)
            .replace(words$, words)
            .replace(anyval$, anyval)
    }

    protected replaceWithParams(route: string, params: Record<string, any>, opts: { match: RegExp, start: number, end: number, subs?: string[] }) {
        route.match(opts.match)?.forEach(v => {
            const name = v.slice(opts.start, v.length - opts.end);
            if (params[name]) {
                const data = params[name];
                if (isArray(data)) {
                    const orgs = opts.subs;
                    const subs: string[] = orgs ? [] : null!;
                    const repl = data.map((d, idx) => {
                        const rp = this.format(d);
                        orgs?.forEach(r => {
                            subs.push(r.replace(v, rp));
                        })
                        return rp;
                    }).join('|');
                    route = route.replace(v, `(${repl})`);
                    if (opts.subs) opts.subs = subs;
                } else {
                    const repl = this.format(data);
                    if (opts.subs) {
                        opts.subs = opts.subs.map(r => r.replace(v, repl));
                    }
                    route = route.replace(v, repl);
                }
            } else {
                route = route.replace(v, tplPth)
            }
        });
        return route;
    }
}


const pattern$ = /(:\w+)|(\/#$)|(\/\+)|(\*)|(\$\{\w+\})/;
const sg$ = /\/\+/g;
const sg = '/[^/]+';

const tval$ = /\$\{\w+\}/g;
const rest$ = /:\w+/g;
const tplPth = '[^/]+';

const mtlPth$ = /\/#$/;
const mtlPth = '(/.{0,})?';

const mtlall$ = /\*\*/g;
const mtlall = '.{0,}';

const doat$ = /\./g;
const doat = '\\.';

const words$ = /\*/g;
const words = '\\w+';

const anyval$ = /\.\{0,\}/g;
const anyval = '.*';

// @Injectable()
// export class KafkaRouteMatcher extends DefaultRouteMatcher {

//     protected override registerPattern(route: string, patterns?: string[], regExp?: RegExp | undefined): void {
//         if (regExp) {
//             this.patterns.set(route, regExp);
//         } else {
//             patterns ? patterns.forEach(p => this.patterns.set(p, p))
//                 : this.patterns.set(route, route);
//         }
//     }
// }
