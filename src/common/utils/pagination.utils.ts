import { Model, PopulateOptions } from 'mongoose';
import { PaginationQueryDto } from '../dtos/pagination-query.dto';

export interface PaginationMetadata {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export interface PaginateOptions<T> {
  model: Model<T>;
  filter: Record<string, unknown>;
  params: PaginationQueryDto;
  select?: string;
  populate?: PopulateOptions[];
  sort?: Record<string, 1 | -1>;
}

/**
 * Generic pagination helper shared by every list endpoint. Runs the page query
 * and the count in parallel.
 */
export async function paginate<T>(
  options: PaginateOptions<T>,
): Promise<PaginatedResult<T>> {
  const {
    model,
    filter,
    params,
    select,
    populate,
    sort = { createdAt: -1 },
  } = options;
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  let query = model.find(filter as never);
  if (select) query = query.select(select);
  if (populate) query = query.populate(populate);

  const [data, totalItems] = await Promise.all([
    query.sort(sort).skip(skip).limit(limit).lean(),
    model.countDocuments(filter as never),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: data as unknown as T[],
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
