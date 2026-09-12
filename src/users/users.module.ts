import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserSeedService } from './service/user-seed.service';
import { UserService } from './service/user.service';

@Module({
	imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
	providers: [UserService, UserSeedService],
	exports: [UserService],
})
export class UsersModule {}
