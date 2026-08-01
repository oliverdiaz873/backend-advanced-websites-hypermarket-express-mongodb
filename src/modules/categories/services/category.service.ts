import { randomUUID } from "crypto";
import * as categoryRepository from "../repositories/category.repository";
import * as productRepository from "../../products/repositories/product.repository";
import * as auditService from "../../../modules/audit/services/audit.service";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { ConflictError } from "../../../shared/errors/conflict.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { slugify } from "../../../shared/utils/slug";
import type { Category, Subcategory } from "../../../types";

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  subcategories?: Subcategory[];
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  subcategories?: Subcategory[];
}

export const getAll = async (): Promise<Category[]> => {
  return categoryRepository.findAll();
};

export const getById = async (id: string): Promise<Category> => {
  const category = await categoryRepository.findById(id);
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  return category;
};

export const create = async (data: CreateCategoryInput, actorId?: string): Promise<Category> => {
  return auditService.runAudited(
    { userId: actorId, action: "CREATE_CATEGORY", resource: "category" },
    async () => {
      if (!data.name || !data.name.trim()) {
        throw new InvalidDataError("Name is required");
      }
      const name = data.name.trim();
      const slug = data.slug && data.slug.trim() ? data.slug.trim() : slugify(name);

      const existingName = await categoryRepository.findByName(name);
      if (existingName) {
        throw new ConflictError(`Category name already exists: ${name}`);
      }
      const existingSlug = await categoryRepository.findBySlug(slug);
      if (existingSlug) {
        throw new ConflictError(`Category slug already exists: ${slug}`);
      }

      return categoryRepository.create({
        _id: randomUUID(),
        name,
        slug,
        subcategories: data.subcategories ?? [],
      });
    },
    (result) => result.id
  );
};

export const updateById = async (id: string, data: UpdateCategoryInput, actorId?: string): Promise<Category> => {
  return auditService.runAudited(
    { userId: actorId, action: "UPDATE_CATEGORY", resource: "category", resourceId: id },
    async () => {
      const existing = await categoryRepository.findById(id);
      if (!existing) {
        throw new NotFoundError("Category not found");
      }

      const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };

      if (data.name !== undefined) {
        if (!data.name.trim()) {
          throw new InvalidDataError("Name cannot be empty");
        }
        const name = data.name.trim();
        const dup = await categoryRepository.findByName(name);
        if (dup && dup.id !== id) {
          throw new ConflictError(`Category name already exists: ${name}`);
        }
        updates.name = name;
      }
      if (data.slug !== undefined) {
        if (!data.slug.trim()) {
          throw new InvalidDataError("Slug cannot be empty");
        }
        const slug = data.slug.trim();
        const dup = await categoryRepository.findBySlug(slug);
        if (dup && dup.id !== id) {
          throw new ConflictError(`Category slug already exists: ${slug}`);
        }
        updates.slug = slug;
      }
      if (data.subcategories !== undefined) {
        updates.subcategories = data.subcategories;
      }

      const updated = await categoryRepository.updateById(id, updates);
      if (!updated) {
        throw new NotFoundError("Category not found");
      }

      await productRepository.updateCategoryEmbeds(id, { name: updated.name, slug: updated.slug });

      return updated;
    }
  );
};

export const remove = async (id: string, actorId?: string): Promise<void> => {
  return auditService.runAudited(
    { userId: actorId, action: "DELETE_CATEGORY", resource: "category", resourceId: id },
    async () => {
      const existing = await categoryRepository.findById(id);
      if (!existing) {
        throw new NotFoundError("Category not found");
      }

      const referenced = await productRepository.existsByCategoryId(id);
      if (referenced) {
        throw new ConflictError("Cannot delete category with referenced products");
      }

      await categoryRepository.deleteById(id);
    }
  );
};
