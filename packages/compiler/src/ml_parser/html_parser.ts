/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {getHtmlTagDefinition} from './html_tags';
import {TokenizeOptions} from './lexer';
import {ParseTreeResult, Parser} from './parser';

export {ParseTreeResult, TreeError} from './parser';

export class HtmlParser extends Parser {
  constructor() { super(getHtmlTagDefinition); }

  parse(source: string, url: string, options?: TokenizeOptions): ParseTreeResult {
    return super.parse(source, url, options);
  }
}
