import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../common/constants/enums';

export type UserDocument = HydratedDocument<User>;

/**
 * Single-account model: one login for buying AND selling.
 * Roles exist only to separate the operational ADMIN from regular USERs —
 * there is deliberately no BUYER/VENDOR split (a user does both).
 */
@Schema({ timestamps: true })
export class User {
	@Prop({ required: true, unique: true, lowercase: true, trim: true })
	email: string;

	@Prop({ required: true })
	passwordHash: string;

	@Prop({ required: true, trim: true })
	fullName: string;

	@Prop({ type: [String], enum: UserRole, default: [UserRole.USER] })
	roles: UserRole[];
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', {
	transform: (_doc, ret) => {
		const output = ret as unknown as Record<string, unknown>;
		delete output.passwordHash;
		delete output.__v;
		return output;
	},
});
