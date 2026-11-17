import { ContractFieldSchema, MicroserviceContract } from './types';

export type ContractIssueSeverity = 'breaking' | 'warning';

export interface ContractCompatIssue {
    severity: ContractIssueSeverity;
    kind:
        | 'model_removed'
        | 'field_removed'
        | 'field_type_changed'
        | 'field_required'
        | 'enum_value_removed'
        | 'route_removed'
        | 'route_changed'
        | 'request_model_changed'
        | 'response_model_changed'
        | 'model_added'
        | 'field_added'
        | 'route_added';
    path: string;
    message: string;
    suggestion: string;
}

export class ContractCompatibilityError extends Error {
    constructor(readonly issues: ContractCompatIssue[]) {
        const breaking = issues.filter(issue => issue.severity === 'breaking');
        super(`Incompatible contract changes:\n${breaking.map(issue => `- ${issue.path}: ${issue.message} (${issue.suggestion})`).join('\n')}`);
        this.name = 'ContractCompatibilityError';
    }
}

const compatiblePrimitives: Record<string, string[]> = {
    number: ['integer'],
    integer: ['number']
};

function sameType(previous: ContractFieldSchema, next: ContractFieldSchema): boolean {
    if (previous.type === next.type) {
        return true;
    }
    return !!compatiblePrimitives[previous.type]?.includes(next.type);
}

/**
 * Compare two contract manifests and report changes that break existing
 * clients. Additive changes are reported as warnings so they can be shown in
 * review without failing CI.
 */
export function compareContracts(previous: MicroserviceContract, next: MicroserviceContract): ContractCompatIssue[] {
    const issues: ContractCompatIssue[] = [];
    const prevModels = previous.models ?? {};
    const nextModels = next.models ?? {};

    Object.entries(prevModels).forEach(([modelName, prevModel]) => {
        const nextModel = nextModels[modelName];
        if (!nextModel) {
            issues.push({
                severity: 'breaking',
                kind: 'model_removed',
                path: `models.${modelName}`,
                message: `model '${modelName}' was removed`,
                suggestion: 'keep the model for one release or bump the major version'
            });
            return;
        }
        Object.entries(prevModel.fields ?? {}).forEach(([fieldName, prevField]) => {
            const nextField = nextModel.fields?.[fieldName];
            const path = `models.${modelName}.${fieldName}`;
            if (!nextField) {
                issues.push({
                    severity: 'breaking',
                    kind: 'field_removed',
                    path,
                    message: `field '${fieldName}' was removed from '${modelName}'`,
                    suggestion: 'keep the field optional/deprecated for one release before removing it'
                });
                return;
            }
            if (!sameType(prevField, nextField)) {
                issues.push({
                    severity: 'breaking',
                    kind: 'field_type_changed',
                    path,
                    message: `field '${fieldName}' changed type from '${prevField.type}' to '${nextField.type}'`,
                    suggestion: 'add a new field and deprecate the old one, or bump the major version'
                });
            }
            if (prevField.required !== true && nextField.required === true) {
                issues.push({
                    severity: 'breaking',
                    kind: 'field_required',
                    path,
                    message: `optional field '${fieldName}' became required`,
                    suggestion: 'keep the field optional or provide a default before requiring it'
                });
            }
            if (prevField.enum?.length) {
                const nextValues = nextField.enum ?? [];
                const removed = prevField.enum.filter(value => !nextValues.includes(value));
                if (removed.length) {
                    issues.push({
                        severity: 'breaking',
                        kind: 'enum_value_removed',
                        path,
                        message: `enum values removed from '${fieldName}': ${removed.join(', ')}`,
                        suggestion: 'keep removed enum values accepted for one release'
                    });
                }
            }
        });
        Object.keys(nextModel.fields ?? {}).forEach(fieldName => {
            if (!prevModel.fields?.[fieldName]) {
                issues.push({
                    severity: 'warning',
                    kind: 'field_added',
                    path: `models.${modelName}.${fieldName}`,
                    message: `field '${fieldName}' added to '${modelName}'`,
                    suggestion: 'additive change; ensure older clients ignore unknown fields'
                });
            }
        });
    });
    Object.keys(nextModels).forEach(modelName => {
        if (!prevModels[modelName]) {
            issues.push({
                severity: 'warning',
                kind: 'model_added',
                path: `models.${modelName}`,
                message: `model '${modelName}' added`,
                suggestion: 'additive change'
            });
        }
    });

    const routeKey = (route: { method: string; path: string }) => `${String(route.method).toUpperCase()} ${route.path}`;
    const prevRoutes = new Map((previous.routes ?? []).map(route => [routeKey(route), route]));
    const nextRoutes = new Map((next.routes ?? []).map(route => [routeKey(route), route]));

    prevRoutes.forEach((prevRoute, key) => {
        const nextRoute = nextRoutes.get(key);
        if (!nextRoute) {
            issues.push({
                severity: 'breaking',
                kind: 'route_removed',
                path: `routes.${key}`,
                message: `route '${key}' was removed`,
                suggestion: 'keep the route for one release or bump the major version'
            });
            return;
        }
        if (prevRoute.request !== nextRoute.request) {
            issues.push({
                severity: 'breaking',
                kind: 'request_model_changed',
                path: `routes.${key}.request`,
                message: `request model changed from '${prevRoute.request ?? 'none'}' to '${nextRoute.request ?? 'none'}'`,
                suggestion: 'accept both models during the migration window'
            });
        }
        if (prevRoute.response !== nextRoute.response) {
            issues.push({
                severity: 'breaking',
                kind: 'response_model_changed',
                path: `routes.${key}.response`,
                message: `response model changed from '${prevRoute.response ?? 'none'}' to '${nextRoute.response ?? 'none'}'`,
                suggestion: 'add a versioned route or keep the previous response shape'
            });
        }
    });
    nextRoutes.forEach((_route, key) => {
        if (!prevRoutes.has(key)) {
            issues.push({
                severity: 'warning',
                kind: 'route_added',
                path: `routes.${key}`,
                message: `route '${key}' added`,
                suggestion: 'additive change'
            });
        }
    });

    return issues;
}

/**
 * Throw when the contract contains breaking changes. Warnings are ignored.
 */
export function assertCompatible(previous: MicroserviceContract, next: MicroserviceContract): ContractCompatIssue[] {
    const issues = compareContracts(previous, next);
    const breaking = issues.filter(issue => issue.severity === 'breaking');
    if (breaking.length) {
        throw new ContractCompatibilityError(issues);
    }
    return issues;
}
