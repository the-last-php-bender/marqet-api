export interface NafdacLookupResult {
  productName: string;
  expiryDate: Date;
  manufacturer?: string;
  isValid: boolean;
}

/**
 * NAFDAC registry abstraction. Production binds RegistryNafdacLookupService,
 * dev/demo binds MockNafdacLookupService, selected by NAFDAC_PROVIDER.
 */
export abstract class NafdacLookupService {
  abstract lookup(nafdacNumber: string): Promise<NafdacLookupResult | null>;
}
