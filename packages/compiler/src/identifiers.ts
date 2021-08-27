/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { CompileTokenMetadata } from './metadata';
import { CompileReflector } from './reflector';
import * as o from './output/ast';

const CORE = '@tsdi/componets';

export class Identifiers {
    static core: o.ExternalReference = { name: null, moduleName: CORE };
}

export function createTokenForReference(reference: any): CompileTokenMetadata {
    return { identifier: { reference: reference } };
}

export function createTokenForExternalReference(
    reflector: CompileReflector, reference: o.ExternalReference): CompileTokenMetadata {
    return createTokenForReference(reflector.resolveExternalReference(reference));
}
