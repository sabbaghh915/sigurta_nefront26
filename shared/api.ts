export interface LoginRequest {
    username?: string;
    password?: string;
    email?: string;
    [key: string]: any;
}

export interface RegisterRequest {
    username?: string;
    password?: string;
    email?: string;
    [key: string]: any;
}

export interface AuthResponse {
    message?: string;
    token?: string;
    user?: any;
    success?: boolean;
}

export interface DemoResponse {
    message: string;
}

export interface QuoteBreakdown {
    netPremium: number;
    stampFee: number;
    warEffort: number;
    martyrFund: number;
    localAdministration: number;
    reconstruction: number;
    total: number;
}

export interface PricingInput {
    insuranceType: "internal" | "border";
    vehicleCode?: string;
    category?: string;
    classification?: string;
    months?: number;
    borderVehicleType?: string;
}

export interface Vehicle {
    _id?: string;
    id?: string;
    ownerName?: string;
    nationalId?: string;
    phoneNumber?: string;
    plateNumber?: string;
    brand?: string;
    model?: string;
    year?: string | number;
    policyDuration?: string;
    coverage?: string;
    vehicleId?: string;
    vehicleType?: "syrian" | "foreign";
    status?: string;

    pricing?: PricingInput & {
        quote?: QuoteBreakdown;
    };

    [key: string]: any;
}

export interface Payment {
    _id?: string;
    vehicleId: string;
    policyNumber: string;
    amount: number;
    paymentMethod: "cash" | "bank-transfer" | "card";
    paidBy: string;
    payerPhone: string;
    paymentStatus: "completed" | "pending" | "failed";
    receiptNumber?: string;
    createdAt?: string;
}

export interface ApiResponse<T = any> {
    success?: boolean;
    message?: string;
    data?: T;
    error?: string;
}
