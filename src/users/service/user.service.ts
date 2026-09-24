import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRole } from '../../common/constants/enums';
import { User, UserDocument } from '../schemas/user.schema';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
}

/** Persistence for the users collection. */
@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    try {
      return await this.userModel.create(input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findByIdOrThrow(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async appendRole(userId: string, role: UserRole): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $addToSet: { roles: role } },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === 11000
    );
  }
}
