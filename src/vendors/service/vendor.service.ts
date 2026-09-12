import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vendor, VendorDocument } from '../schemas/vendor.schema';

export interface CreateVendorInput {
	storeName: string;
	description?: string;
	logoUrl?: string;
	address?: string;
}

@Injectable()
export class VendorService {
	constructor(@InjectModel(Vendor.name) private readonly vendorModel: Model<VendorDocument>) {}

	/** Creates the caller's store profile. One per user — a second attempt is a conflict. */
	async createForUser(userId: string, input: CreateVendorInput): Promise<VendorDocument> {
		try {
			return await this.vendorModel.create({ ...input, userId: new Types.ObjectId(userId) });
		} catch (error) {
			if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
				throw new ConflictException('You already have a store profile.');
			}
			throw error;
		}
	}

	async findByUserIdOrThrow(userId: string): Promise<VendorDocument> {
		const vendor = await this.vendorModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
		if (!vendor) throw new NotFoundException('You do not have a store profile yet. Create one via POST /vendors.');
		return vendor;
	}

	async findByIdOrThrow(vendorId: string): Promise<VendorDocument> {
		const vendor = await this.vendorModel.findById(vendorId).exec();
		if (!vendor) throw new NotFoundException('Vendor not found.');
		return vendor;
	}
}
