import { Injectable } from '@nestjs/common';
import { NafdacLookupResult, NafdacLookupService } from './nafdac-lookup.service';

/**
 * Deterministic mock for local dev and demos.
 * A number is "valid" when it matches the real-world NAFDAC shape:
 *   <category code><form>-<4 to 6 digits>   e.g. A1-12345, B7-123456, C2-1234
 * Expiry is synthesised 18 months from now so the full happy path works offline.
 */
const VALID_NAFDAC_PATTERN = /^[A-Z]\d-\d{4,6}$/;
const MOCK_EXPIRY_MONTHS = 18;

@Injectable()
export class MockNafdacLookupService extends NafdacLookupService {
	async lookup(nafdacNumber: string): Promise<NafdacLookupResult | null> {
		const normalized = nafdacNumber.trim().toUpperCase();
		if (!VALID_NAFDAC_PATTERN.test(normalized)) return null;

		const expiryDate = new Date();
		expiryDate.setMonth(expiryDate.getMonth() + MOCK_EXPIRY_MONTHS);

		return {
			productName: `Registered Product ${normalized}`,
			expiryDate,
			manufacturer: 'Mock Pharmaceuticals Ltd.',
			isValid: true,
		};
	}
}
