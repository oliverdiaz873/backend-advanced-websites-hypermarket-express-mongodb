import { Schema, type DeleteResult, type HydratedDocument, type Model, type Query, type QueryWithHelpers } from "mongoose";

export interface ISoftDelete {
  isDeleted: boolean;
  deletedAt?: Date | null;
}

export interface ISoftDeleteDocument extends ISoftDelete {
  softDelete(): Promise<HydratedDocument<this>>;
  restore(): Promise<HydratedDocument<this>>;
}

export interface SoftDeleteModel<T extends ISoftDelete = ISoftDelete> extends Model<T> {
  findActive(): QueryWithHelpers<Array<HydratedDocument<T>>, HydratedDocument<T>>;
  findIncludingDeleted(): QueryWithHelpers<Array<HydratedDocument<T>>, HydratedDocument<T>>;
  findDeleted(): QueryWithHelpers<Array<HydratedDocument<T>>, HydratedDocument<T>>;
  countActive(): QueryWithHelpers<number, HydratedDocument<T>>;
  countIncludingDeleted(): QueryWithHelpers<number, HydratedDocument<T>>;
  deletePermanently(id: string): QueryWithHelpers<DeleteResult, HydratedDocument<T>>;
}

const INCLUDE_DELETED = "includeDeleted";

function applySoftDeleteFilter(this: Query<unknown, unknown>): void {
  const filter = this.getFilter();
  if (!filter) return;
  const cast = filter as Record<string, unknown>;
  const includeDeleted = cast[INCLUDE_DELETED] === true;
  delete cast[INCLUDE_DELETED];
  if (!includeDeleted) {
    cast.isDeleted = false;
  }
}

export const softDeletePlugin = (schema: Schema): void => {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  });

  schema.pre("find", applySoftDeleteFilter);
  schema.pre("findOne", applySoftDeleteFilter);
  schema.pre("findOneAndUpdate", applySoftDeleteFilter);
  schema.pre("findOneAndDelete", applySoftDeleteFilter);
  schema.pre("countDocuments", applySoftDeleteFilter);
  schema.pre("deleteOne", applySoftDeleteFilter);
  schema.pre("deleteMany", applySoftDeleteFilter);

  schema.methods.softDelete = function (this: HydratedDocument<ISoftDeleteDocument>) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = function (this: HydratedDocument<ISoftDeleteDocument>) {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
  };

  schema.statics.findActive = function <T extends ISoftDelete>(this: Model<T>) {
    return this.find({});
  };

  schema.statics.findIncludingDeleted = function <T extends ISoftDelete>(this: Model<T>) {
    return this.find({ [INCLUDE_DELETED]: true });
  };

  schema.statics.findDeleted = function <T extends ISoftDelete>(this: Model<T>) {
    return this.find({ isDeleted: true, [INCLUDE_DELETED]: true });
  };

  schema.statics.countActive = function <T extends ISoftDelete>(this: Model<T>) {
    return this.countDocuments({});
  };

  schema.statics.countIncludingDeleted = function <T extends ISoftDelete>(this: Model<T>) {
    return this.countDocuments({ [INCLUDE_DELETED]: true });
  };

  schema.statics.deletePermanently = function <T extends ISoftDelete>(this: Model<T>, id: string) {
    return this.deleteOne({ _id: id, [INCLUDE_DELETED]: true });
  };
};
