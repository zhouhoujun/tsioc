import { Injectable, isArray, isString } from '@tsdi/ioc';
import { hdr } from '../consts';
import { Negotiator } from '../negotiator';
import { HttpContext } from './context';



@Injectable()
export class HttpNegotiator extends Negotiator {
  constructor(private ctx: HttpContext) {
    super()
  }

  charsets(...accepts: string[]): string[] {
    const accepted = this.parseCharset(this.ctx.getHeader(hdr.ACCEPT_CHARSET) ?? '*');
    if (!accepts) {
      return this.getValues(accepted)
    }

    const pri = accepts.map((a, i) => this.getPriority(a, accepted, i));
    return this.sortSpecify(pri).map(p => accepts[pri.indexOf(p)])
  }

  encodings(...accepts: string[]): string[] {
    const accepted = this.parseEncoding(this.ctx.getHeader(hdr.ACCEPT_ENCODING) ?? '');
    if (!accepts.length) {
      return this.getValues(accepted)
    }
    const pri = accepts.map((a, i) => this.getPriority(a, accepted, i));
    return this.sortSpecify(pri).map(p => accepts[pri.indexOf(p)])
  }

  languages(...accepts: string[]): string[] {
    const accepted = this.parseLanguage(this.ctx.getHeader(hdr.ACCEPT_LANGUAGE) ?? '*');
    if (!accepts.length) {
      return this.getValues(accepted)
    }
    const pri = accepts.map((a, i) => this.getPriority(a, accepted, i, lang));
    return this.sortSpecify(pri).map(p => accepts[pri.indexOf(p)])
  }

  mediaTypes(...accepts: string[]): string[] {
    const accepted = this.parseMedia(this.ctx.getHeader(hdr.ACCEPT) ?? '*');
    if (!accepts.length) {
      return this.getValues(accepted)
    }
    const pri = accepts.map((a, i) => this.getPriority(a, accepted, i, media));
    return this.sortSpecify(pri).map(p => accepts[pri.indexOf(p)])
  }

  protected parseCharset(aspect: string | string[]): Accepted[] {
    const aspects = isString(aspect) ? aspect.split(',') : aspect;
    const ch: Accepted[] = [];
    aspects.forEach((str, idx) => {
      let info = this.matchify(str, idx);
      if (info) {
        ch.push(info)
      }
    });
    return ch
  }

  protected parseEncoding(encoding: string | string[]) {
    const accepts = isArray(encoding) ? encoding : encoding.split(',');
    let hasIdentity = false;
    let minQuality = 1;
    let encodings: Accepted[] = [];
    accepts.forEach((a, i) => {
      let enco = this.matchify(a.trim(), i);
      if (enco) {
        encodings.push(enco);
        hasIdentity = hasIdentity || this.specify(hdr.IDENTITY, enco) !== null;
        minQuality = Math.min(minQuality, enco.q || 1)
      }
    });
    if (hasIdentity) {
      encodings.push({
        value: hdr.IDENTITY,
        q: minQuality,
        i: accepts.length
      })
    }
    return encodings
  }

  protected sortAsccepted(accepted: Accepted[]) {
    return accepted.filter(a => a.q > 0)
      .sort((a, b) => (b.q - a.q) || (a.i - b.i) || 0)
  }

  protected getValues(accepted: Accepted[]) {
    return this.sortAsccepted(accepted).map(a => a.value)
  }

  protected sortSpecify(specify: Specify[]): Specify[] {
    return specify.filter(p => p.q > 0)
      .sort((a, b) => (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || 0)
  }

  protected matchify(str: string, i: number): null | Accepted {
    let match = charsetRegExp.exec(str);
    if (!match) return null;

    let charset = match[1].toString();
    let q = 1;
    if (match[2]) {
      let params = match[2].split(';')
      for (let j = 0; j < params.length; j++) {
        let p = params[j].trim().split('=');
        if (p[0] === 'q') {
          q = parseFloat(p[1]);
          break
        }
      }
    }

    return {
      value: charset,
      q: q,
      i: i
    }
  }

  protected getPriority(value: string, accepted: Accepted[], index: number, v?: 'lang' | 'media'): Specify {
    let priority = { o: -1, q: 0, s: 0 };
    let specify: Function;
    switch (v) {
      case lang:
        specify = this.langSpecify;
        break;
      case media:
        specify = this.mediaSpecify;
        break;
      default:
        specify = this.specify;
        break;
    }

    for (let i = 0; i < accepted.length; i++) {
      let spec = specify.call(this, value, accepted[i] as any, index);

      if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
        priority = spec
      }
    }

    return priority
  }

  protected specify(value: string, spec: Accepted, index?: number): Specify | null {
    let s = 0;
    if (spec.value.toLowerCase() === value.toLowerCase()) {
      s |= 1;
    } else if (spec.value !== '*') {
      return null
    }

    return {
      i: index,
      o: spec.i,
      q: spec.q,
      s: s
    }
  }

  langSpecify(language: string, spec: LangAccepted, index?: number): Specify | null {
    let p = this.langMatchify(language)
    if (!p) return null;
    let s = 0;
    if (spec.value.toLowerCase() === p.value.toLowerCase()) {
      s |= 4
    } else if (spec.prefix.toLowerCase() === p.value.toLowerCase()) {
      s |= 2
    } else if (spec.value.toLowerCase() === p.prefix.toLowerCase()) {
      s |= 1
    } else if (spec.value !== '*') {
      return null
    }

    return {
      i: index,
      o: spec.i,
      q: spec.q,
      s: s
    }
  }

  protected parseLanguage(aspect: string | string[]): LangAccepted[] {
    const aspects = isString(aspect) ? aspect.split(',') : aspect;
    const langs: LangAccepted[] = [];
    aspects.forEach((str, idx) => {
      let info = this.langMatchify(str, idx);
      if (info) {
        langs.push(info)
      }
    });
    return langs
  }

  protected langMatchify(str: string, i: number = 0): LangAccepted | null {
    let match = langRegExp.exec(str);
    if (!match) return null;

    let prefix = match[1],
      suffix = match[2],
      full = prefix;

    if (suffix) full += "-" + suffix;

    let q = 1;
    if (match[3]) {
      let params = match[3].split(';')
      for (let j = 0; j < params.length; j++) {
        let p = params[j].split('=');
        if (p[0] === 'q') q = parseFloat(p[1]);
      }
    }

    return {
      prefix: prefix,
      suffix: suffix,
      q: q,
      i: i,
      value: full
    }
  }


  protected parseMedia(accept: string | string[]) {
    const accepts = isArray(accept) ? accept : accept.split(',');
    let j = 0
    for (let i = 1; i < accepts.length; i++) {
      if (this.quoteCount(accepts[j]) % 2 == 0) {
        accepts[++j] = accepts[i]
      } else {
        accepts[j] += ',' + accepts[i]
      }
    }
    // trim accepts
    accepts.length = j + 1;
    const medias: MediaAccepted[] = [];
    accepts.forEach((v, i) => {
      let media = this.mediaMatchify(v.trim(), i);
      if (media) {
        medias.push(media)
      }
    });
    return medias
  }

  protected mediaMatchify(str: string, i: number = 0): MediaAccepted | null {
    let match = mediaRegExp.exec(str);
    if (!match) return null;

    let params = Object.create(null);
    let q = 1;
    let subtype = match[2];
    let type = match[1];

    if (match[3]) {
      let kvps = this.splitParameters(match[3]).map(this.splitKeyValuePair);

      for (let j = 0; j < kvps.length; j++) {
        let pair = kvps[j];
        let key = pair[0]?.toLowerCase();
        let val = pair[1];

        // get the value, unwrapping quotes
        let value = val && val[0] === '"' && val[val.length - 1] === '"'
          ? val.substring(1, val.length - 2)
          : val;

        if (key === 'q' && value) {
          q = parseFloat(value);
          break
        }
        if (key) {
          // store parameter
          params[key] = value
        }
      }
    }

    return {
      type,
      subtype,
      params,
      value: `${type}/${subtype}`,
      q,
      i
    }
  }

  quoteCount(str: string) {
    let count = 0;
    let index = 0;

    while ((index = str.indexOf('"', index)) !== -1) {
      count++;
      index++;
    }

    return count
  }

  protected mediaSpecify(type: string, spec: MediaAccepted, index?: number) {
    let p = this.mediaMatchify(type);
    let s = 0;

    if (!p) {
      return null
    }

    if (spec.type.toLowerCase() == p.type.toLowerCase()) {
      s |= 4
    } else if (spec.type != '*') {
      return null
    }

    if (spec.subtype.toLowerCase() == p.subtype.toLowerCase()) {
      s |= 2
    } else if (spec.subtype != '*') {
      return null
    }

    let keys = Object.keys(spec.params);
    if (keys.length > 0) {
      if (keys.every(k => {
        return spec.params[k] == '*' || (spec.params[k] || '').toLowerCase() == (p!.params[k] || '').toLowerCase();
      })) {
        s |= 1
      } else {
        return null
      }
    }

    return {
      i: index,
      o: spec.i,
      q: spec.q,
      s: s,
    }
  }

  private splitParameters(str: string) {
    let parameters = str.split(';');
    let j = 0;
    for (let i = 1; i < parameters.length; i++) {
      if (this.quoteCount(parameters[j]) % 2 == 0) {
        parameters[++j] = parameters[i]
      } else {
        parameters[j] += ';' + parameters[i]
      }
    }

    // trim parameters
    parameters.length = j + 1;

    for (let i = 0; i < parameters.length; i++) {
      parameters[i] = parameters[i].trim()
    }

    return parameters
  }

  private splitKeyValuePair(str: string) {
    let index = str.indexOf('=');
    let key;
    let val;

    if (index === -1) {
      key = str
    } else {
      key = str.substring(0, index);
      val = str.substring(index + 1)
    }

    return [key, val]
  }
}

const lang = 'lang';
const media = 'media';

const charsetRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
const langRegExp = /^\s*([^\s\-;]+)(?:-([^\s;]+))?\s*(?:;(.*))?$/;
const mediaRegExp = /^\s*([^\s\/;]+)\/([^;\s]+)\s*(?:;(.*))?$/;
interface Accepted {
  q: number;
  i: number;
  value: string;
}

interface LangAccepted extends Accepted {
  prefix: string;
  suffix: string;
}

interface LangAccepted extends Accepted {
  prefix: string;
  suffix: string;
}

interface MediaAccepted extends Accepted {
  type: string;
  subtype: string;
  params: Record<string, any>,
}

interface Specify {
  i?: number;
  o: number;
  q: number;
  s: number;
}