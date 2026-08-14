import { randomUUID } from "crypto";
import * as brandRepository from "../repositories/brand.repository";
import * as productRepository from "../../products/repositories/product.repository";
import * as auditService from "../../../modules/audit/services/audit.service";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { ConflictError } from "../../../shared/errors/conflict.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { slugify } from "../../../shared/utils/slug";
import type { Brand, BrandStatus } from "../../../types";

export interface CreateBrandInput {
  name: string;
  slug?: string;
  description?: string;
  logo?: string;
  status?: BrandStatus;
}

export interface UpdateBrandInput {
  name?: string;
  slug?: string;
  description?: string;
  logo?: string;
  status?: BrandStatus;
}

export const getAll = async (): Promise<Brand[]> => {
  return brandRepository.findAll();
};

export const getById = async (id: string): Promise<Brand> => {
  const brand = await brandRepository.findById(id);
  if (!brand) {
    throw new NotFoundError("Brand not found");
  }
  return brand;
};

export const create = async (data: CreateBrandInput, actorId?: string): Promise<Brand> => {
  return auditService.runAudited(
    { userId: actorId, action: "CREATE_BRAND", resource: "brand" },
    async () => {
      if (!data.name || !data.name.trim()) {
        throw new InvalidDataError("Name is required");
      }
      const name = data.name.trim();
      const slug = data.slug && data.slug.trim() ? data.slug.trim() : slugify(name);

      const existingName = await brandRepository.findByName(name);
      if (existingName) {
        throw new ConflictError(`Brand name already exists: ${name}`);
      }
      const existingSlug = await brandRepository.findBySlug(slug);
      if (existingSlug) {
        throw new ConflictError(`Brand slug already exists: ${slug}`);
      }

      return brandRepository.create({
        _id: randomUUID(),
        name,
        slug,
        description: data.description,
        logo: data.logo,
        status: data.status ?? "active",
      });
    },
    (result) => result.id
  );
};

export const updateById = async (id: string, data: UpdateBrandInput, actorId?: string): Promise<Brand> => {
  return auditService.runAudited(
    { userId: actorId, action: "UPDATE_BRAND", resource: "brand", resourceId: id },
    async () => {
      const existing = await brandRepository.findById(id);
      if (!existing) {
        throw new NotFoundError("Brand not found");
      }

      const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };

      if (data.name !== undefined) {
        if (!data.name.trim()) {
          throw new InvalidDataError("Name cannot be empty");
        }
        const name = data.name.trim();
        const dup = await brandRepository.findByName(name);
        if (dup && dup.id !== id) {
          throw new ConflictError(`Brand name already exists: ${name}`);
        }
        updates.name = name;
      }
      if (data.slug !== undefined) {
        if (!data.slug.trim()) {
          throw new InvalidDataError("Slug cannot be empty");
        }
        const slug = data.slug.trim();
        const dup = await brandRepository.findBySlug(slug);
        if (dup && dup.id !== id) {
          throw new ConflictError(`Brand slug already exists: ${slug}`);
        }
        updates.slug = slug;
      }
      if (data.description !== undefined) updates.description = data.description;
      if (data.logo !== undefined) updates.logo = data.logo;
      if (data.status !== undefined) updates.status = data.status;

      const updated = await brandRepository.updateById(id, updates);
      if (!updated) {
        throw new NotFoundError("Brand not found");
      }

      await productRepository.updateBrandEmbeds(id, { name: updated.name, slug: updated.slug });

      return updated;
    }
  );
};

export const remove = async (id: string, actorId?: string): Promise<void> => {
  return auditService.runAudited(
    { userId: actorId, action: "DELETE_BRAND", resource: "brand", resourceId: id },
    async () => {
      const existing = await brandRepository.findById(id);
      if (!existing) {
        throw new NotFoundError("Brand not found");
      }

      const referenced = await productRepository.existsByBrandId(id);
      if (referenced) {
        throw new ConflictError("Cannot delete brand with referenced products");
      }

      await brandRepository.softDeleteById(id);
    }
  );
};

export const restore = async (id: string, actorId?: string): Promise<void> => {
  return auditService.runAudited(
    { userId: actorId, action: "RESTORE_BRAND", resource: "brand", resourceId: id },
    async () => {
      const restored = await brandRepository.restoreById(id);
      if (!restored) {
        throw new NotFoundError("Brand not found");
      }
    }
  );
};
