/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

 import {noUndefined} from '../../../src/util';
import { CompileTypeMetadata, CompileDirectiveMetadata, CompileTemplateMetadata } from '../../../src/compile_metadata';
import { preserveWhitespacesDefault } from '../../../src/config';

export function createTypeMeta({reference, diDeps}: {reference: any, diDeps?: any[]}):
    CompileTypeMetadata {
  return {reference: reference, diDeps: diDeps || [], lifecycleHooks: []};
}

export function compileDirectiveMetadataCreate(
    {isHost, type, isComponent, selector, exportAs, inputs, outputs, host, providers, viewProviders,
     queries, guards, viewQueries, entryComponents, template, componentViewType,
     rendererType}: Partial<Parameters<typeof CompileDirectiveMetadata.create>[0]>) {
  return CompileDirectiveMetadata.create({
    isHost: !!isHost,
    type: noUndefined(type) !,
    isComponent: !!isComponent,
    selector: noUndefined(selector),
    exportAs: noUndefined(exportAs),
    changeDetection: null,
    inputs: inputs || [],
    outputs: outputs || [],
    host: host || {},
    providers: providers || [],
    viewProviders: viewProviders || [],
    queries: queries || [],
    guards: guards || {},
    viewQueries: viewQueries || [],
    entryComponents: entryComponents || [],
    template: noUndefined(template) !,
    componentViewType: noUndefined(componentViewType),
    rendererType: noUndefined(rendererType),
    componentFactory: null,
  });
}

export function compileTemplateMetadata(
    {encapsulation, template, templateUrl, styles, styleUrls, externalStylesheets, animations,
     ngContentSelectors, interpolation, isInline,
     preserveWhitespaces}: Partial<CompileTemplateMetadata>): CompileTemplateMetadata {
  return new CompileTemplateMetadata({
    encapsulation: noUndefined(encapsulation),
    template: noUndefined(template),
    templateUrl: noUndefined(templateUrl),
    htmlAst: null,
    styles: styles || [],
    styleUrls: styleUrls || [],
    externalStylesheets: externalStylesheets || [],
    animations: animations || [],
    ngContentSelectors: ngContentSelectors || [],
    interpolation: noUndefined(interpolation),
    isInline: !!isInline,
    preserveWhitespaces: preserveWhitespacesDefault(noUndefined(preserveWhitespaces)),
  });
}
