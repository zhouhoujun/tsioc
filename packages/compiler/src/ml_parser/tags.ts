/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

 export enum TagContentType {
    RAW_TEXT,
    ESCAPABLE_RAW_TEXT,
    PARSABLE_DATA
  }
  
  export interface TagDefinition {
    closedByParent: boolean;
    implicitNamespacePrefix: string|null;
    isVoid: boolean;
    ignoreFirstLf: boolean;
    canSelfClose: boolean;
    preventNamespaceInheritance: boolean;
  
    isClosedByChild(name: string): boolean;
    getContentType(prefix?: string): TagContentType;
  }
  
  export function splitNsName(elementName: string): [string|null, string] {
    if (elementName[0] != ':') {
      return [null, elementName];
    }
  
    const colonIndex = elementName.indexOf(':', 1);
  
    if (colonIndex === -1) {
      throw new Error(`Unsupported format "${elementName}" expecting ":namespace:name"`);
    }
  
    return [elementName.slice(1, colonIndex), elementName.slice(colonIndex + 1)];
  }
  
  // `<v-container>` tags work the same regardless the namespace
  export function isContainer(tagName: string): boolean {
    return splitNsName(tagName)[1] === 'v-container';
  }
  
  // `<v-content>` tags work the same regardless the namespace
  export function isContent(tagName: string): boolean {
    return splitNsName(tagName)[1] === 'v-content';
  }
  
  // `<v-template>` tags work the same regardless the namespace
  export function isTemplate(tagName: string): boolean {
    return splitNsName(tagName)[1] === 'v-template';
  }
  
  export function getNsPrefix(fullName: string): string;
  export function getNsPrefix(fullName: null): null;
  export function getNsPrefix(fullName: string|null): string|null {
    return fullName === null ? null : splitNsName(fullName)[0];
  }
  
  export function mergeNsAndName(prefix: string, localName: string): string {
    return prefix ? `:${prefix}:${localName}` : localName;
  }
  