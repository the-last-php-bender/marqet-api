import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/constants/enums';
import { CreateUserInput, UserService } from './user.service';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Bootstrap seed: when ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD are set, ensures
 * that admin account exists.
 */
@Injectable()
export class UserSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UserSeedService.name);

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.configService.get<string>('ADMIN_SEED_EMAIL');
    const password = this.configService.get<string>('ADMIN_SEED_PASSWORD');
    if (!email || !password) return;

    const existing = await this.userService.findByEmail(email);
    if (existing) {
      if (!existing.roles.includes(UserRole.ADMIN)) {
        await this.userService.appendRole(
          existing._id.toString(),
          UserRole.ADMIN,
        );
        this.logger.log(`Granted ADMIN to existing user ${email}`);
      }
      return;
    }

    const input: CreateUserInput = {
      email,
      passwordHash: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
      fullName: 'Platform Admin',
    };
    const admin = await this.userService.create(input);
    await this.userService.appendRole(admin._id.toString(), UserRole.ADMIN);
    this.logger.log(`Seeded admin account ${email}`);
  }
}
