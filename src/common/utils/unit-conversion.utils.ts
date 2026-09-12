import { LengthUnit } from '../constants/enums';

/**
 * Centimetres per unit — the single conversion table for real-world dimensions.
 * Data-driven (Open/Closed): adding a unit means adding one entry here, nothing else.
 */
export const CM_PER_UNIT: Record<LengthUnit, number> = {
	[LengthUnit.CM]: 1,
	[LengthUnit.INCH]: 2.54,
	[LengthUnit.FEET]: 30.48,
};

export function toCm(value: number, unit: LengthUnit): number {
	return value * CM_PER_UNIT[unit];
}
