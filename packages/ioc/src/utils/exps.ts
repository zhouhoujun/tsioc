import { DecoratorScope } from '../types';

export const clsStartExp = /^[A-Z@]/;
export const clsUglifyExp = /^[a-z0-9]$/;
export const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
export const ARGUMENT_NAMES = /([^\s,]+)/g;
export const refInjExp = /^Ref\s+[\w\{\}]+\sfor/;
export const ParamerterName = 'paramerter_names';

export const befAnn: DecoratorScope = 'BeforeAnnoation';
export const aftAnn: DecoratorScope = 'AfterAnnoation';
export const ann: DecoratorScope = 'Annoation';
export const cls: DecoratorScope = 'Class';
export const mth: DecoratorScope = 'Method';
export const ptr: DecoratorScope = 'Property';
export const parm: DecoratorScope = 'Parameter';
export const befCstr: DecoratorScope = 'BeforeConstructor';
export const aftCstr: DecoratorScope = 'AfterConstructor';
