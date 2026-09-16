import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../schemas/category.schema';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(
    name: string,
    requiresNafdac: boolean,
    description?: string,
  ): Promise<CategoryDocument> {
    try {
      return await this.categoryModel.create({
        name: name.trim(),
        requiresNafdac,
        description,
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: number }).code === 11000
      ) {
        throw new ConflictException(`Category "${name}" already exists.`);
      }
      throw error;
    }
  }

  findAll(): Promise<CategoryDocument[]> {
    return this.categoryModel.find().sort({ name: 1 }).exec();
  }

  async findByIdOrThrow(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) throw new NotFoundException('Category not found.');
    return category;
  }

  async count(): Promise<number> {
    return this.categoryModel.countDocuments();
  }

  async insertManyIfEmpty(
    docs: Array<{ name: string; requiresNafdac: boolean; description: string }>,
  ): Promise<void> {
    if ((await this.count()) > 0) return;
    await this.categoryModel.insertMany(docs);
  }
}
