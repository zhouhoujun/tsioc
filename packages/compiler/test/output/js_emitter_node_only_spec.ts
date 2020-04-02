/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import expect = require('expect');
import {JavaScriptEmitter} from '../../src/output/js_emitter';
import * as o from '../../src/output/output_ast';
import {SourceMap} from '../../src/output/source_map';
import {ParseLocation, ParseSourceFile, ParseSourceSpan} from '../../src/parse_util';
import { originalPositionFor, extractSourceMap } from './source_map';


const someGenFilePath = 'somePackage/someGenFile';

{
  describe('JavaScriptEmitter 2', () => {
    let emitter: JavaScriptEmitter;
    let someVar: o.ReadVarExpr;

    beforeEach(() => { emitter = new JavaScriptEmitter(); });

    function emitSourceMap(stmt: o.Statement | o.Statement[], preamble?: string): SourceMap {
      const stmts = Array.isArray(stmt) ? stmt : [stmt];
      const source = emitter.emitStatements(someGenFilePath, stmts, preamble);
      return extractSourceMap(source) !;
    }

    describe('source maps', () => {
      it('should emit an inline source map', () => {
        const source = new ParseSourceFile(';;;var', 'in.js');
        const startLocation = new ParseLocation(source, 0, 0, 3);
        const endLocation = new ParseLocation(source, 7, 0, 6);
        const sourceSpan = new ParseSourceSpan(startLocation, endLocation);
        const someVar = o.variable('someVar', null, sourceSpan);
        const sm = emitSourceMap(someVar.toStmt(), '/* MyPreamble \n */');

        expect(sm.sources).toEqual([someGenFilePath, 'in.js']);
        expect(sm.sourcesContent).toEqual([' ', ';;;var']);
        expect(originalPositionFor(sm, {line: 3, column: 0}))
            .toEqual({line: 1, column: 3, source: 'in.js'});
      });
    });
  });
}
