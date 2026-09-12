import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { NafdacLookupResult, NafdacLookupService } from './nafdac-lookup.service';

/**
 * Row shape served by the OFFICIAL NAFDAC Greenbook product feed
 * (greenbook.nafdac.gov.ng). The Greenbook exposes its catalogue through a
 * server-side JSON protocol (DataTables) on its root URL; it only answers
 * JSON when called with `X-Requested-With: XMLHttpRequest`, otherwise it
 * renders the HTML page. We always speak JSON to that endpoint and match the
 * registration number exactly — never HTML scraping.
 */
interface GreenbookRow {
	NAFDAC?: string;
	product_name?: string;
	status?: string;
	expiry_date?: string;
	approval_date?: string;
	applicant?: { name?: string } | null;
	applicant_name?: string;
}

interface GreenbookFeedResponse {
	recordsTotal?: number;
	recordsFiltered?: number;
	data?: GreenbookRow[];
}

/**
 * Real NAFDAC registry adapter backed by the official Greenbook.
 * Enable with NAFDAC_PROVIDER=registry (+ optional NAFDAC_REGISTRY_BASE_URL
 * override, defaults to the production Greenbook).
 */
@Injectable()
export class RegistryNafdacLookupService extends NafdacLookupService {
	private static readonly DEFAULT_BASE_URL = 'https://greenbook.nafdac.gov.ng';

	private readonly logger = new Logger(RegistryNafdacLookupService.name);
	private readonly baseUrl: string;

	constructor(
		private readonly httpService: HttpService,
		configService: ConfigService,
	) {
		super();
		this.baseUrl = (
			configService.get<string>('NAFDAC_REGISTRY_BASE_URL') ?? RegistryNafdacLookupService.DEFAULT_BASE_URL
		).replace(/\/+$/, '');
	}

	async lookup(nafdacNumber: string): Promise<NafdacLookupResult | null> {
		const query = nafdacNumber.trim().toUpperCase();
		try {
			const response = await firstValueFrom(
				this.httpService.get<GreenbookFeedResponse>(this.baseUrl, {
					params: {
						draw: 1,
						start: 0,
						length: 25,
						'search[value]': query,
					},
					headers: {
						Accept: 'application/json',
						'X-Requested-With': 'XMLHttpRequest',
						'User-Agent': 'MarqetAPI/1.0',
					},
					timeout: 15_000,
				}),
			);

			const rows = Array.isArray(response.data?.data) ? response.data.data : [];
			const row =
				rows.find((candidate) => String(candidate.NAFDAC ?? '').trim().toUpperCase() === query) ?? null;
			if (!row?.product_name || !row.expiry_date) return null;

			const expiryDate = new Date(row.expiry_date);
			return {
				productName: row.product_name.replace(/[#*]/g, '').trim(),
				expiryDate,
				manufacturer: row.applicant?.name ?? row.applicant_name,
				isValid: String(row.status ?? '').toLowerCase() === 'active' && expiryDate > new Date(),
			};
		} catch (error) {
			this.logger.error(`NAFDAC Greenbook lookup failed for ${query}`, error instanceof Error ? error.stack : undefined);
			throw error;
		}
	}
}
