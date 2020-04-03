/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// Attention:
// This file duplicates types and values from @angular/core
// so that we are able to make @angular/compiler independent of @angular/core.
// This is important to prevent a build cycle, as @angular/core needs to
// be compiled with the compiler.

import { Type, ProviderTypes } from '@tsdi/ioc';

export interface Query {
  descendants: boolean;
  first: boolean;
  read: any;
  isViewQuery: boolean;
  selector: any;
  static?: boolean;
}

export interface Directive {
  selector?: string;
  inputs?: string[];
  outputs?: string[];
  host?: {[key: string]: string};
  providers?: ProviderTypes[];
  exportAs?: string;
  queries?: {[key: string]: any};
  guards?: {[key: string]: any};
}

export interface Component extends Directive {
  changeDetection?: ChangeDetectionStrategy;
  viewProviders?: ProviderTypes[];
  moduleId?: string;
  templateUrl?: string;
  template?: string;
  styleUrls?: string[];
  styles?: string[];
  animations?: any[];
  encapsulation?: ViewEncapsulation;
  interpolation?: [string, string];
  entryComponents?: Array<Type|any[]>;
  preserveWhitespaces?: boolean;
}
export enum ViewEncapsulation {
  Emulated = 0,
  Native = 1,
  None = 2,
  ShadowDom = 3
}

export enum ChangeDetectionStrategy {
  OnPush = 0,
  Default = 1
}

export interface SchemaMetadata { name: string; }

export const CUSTOM_ELEMENTS_SCHEMA: SchemaMetadata = {
  name: 'custom-elements'
};

export const NO_ERRORS_SCHEMA: SchemaMetadata = {
  name: 'no-errors-schema'
};

export enum SecurityContext {
  NONE = 0,
  HTML = 1,
  STYLE = 2,
  SCRIPT = 3,
  URL = 4,
  RESOURCE_URL = 5,
}


export enum MissingTranslationStrategy {
  Error = 0,
  Warning = 1,
  Ignore = 2,
}
