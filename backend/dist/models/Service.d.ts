export interface Service {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
export interface CreateServiceData {
    name: string;
    description?: string;
    is_active?: boolean;
}
export interface UpdateServiceData {
    name?: string;
    description?: string;
    is_active?: boolean;
}
//# sourceMappingURL=Service.d.ts.map