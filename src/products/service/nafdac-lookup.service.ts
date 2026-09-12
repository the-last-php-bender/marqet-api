export interface NafdacLookupResult {
	productName: string;
	expiryDate: Date;
	manufacturer?: string;
	isValid: boolean;
}

/**
 * NAFDAC registry abstraction (Dependency Inversion boundary).
 * Production binds RegistryNafdacLookupService, dev/demo binds
 * MockNafdacLookupService — switched purely by NAFDAC_PROVIDER env.
 */
export abstract class NafdacLookupService {
	abstract lookup(nafdacNumber: string): Promise<NafdacLookupResult | null>;
}
