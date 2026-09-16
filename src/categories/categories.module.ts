import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './schemas/category.schema';
import { CategoryController } from './controller/category.controller';
import { CategorySeedService } from './service/category-seed.service';
import { CategoryService } from './service/category.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [CategoryController],
  providers: [CategoryService, CategorySeedService],
  exports: [CategoryService],
})
export class CategoriesModule {}
