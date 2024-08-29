

export interface Serializable {
    serialize(ignores?: string[]): Record<string, any>;
}