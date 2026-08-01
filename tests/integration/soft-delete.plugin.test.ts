import mongoose from "mongoose";
import { softDeletePlugin, type ISoftDeleteDocument, type SoftDeleteModel } from "../../src/shared/plugins/soft-delete.plugin";

interface IWidget extends ISoftDeleteDocument {
  _id: string;
  name: string;
}

const widgetSchema = new mongoose.Schema<IWidget>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
  },
  { collection: "soft_delete_widgets" }
);
widgetSchema.plugin(softDeletePlugin);

const WidgetModel = mongoose.model<IWidget, SoftDeleteModel<IWidget>>("SoftDeleteWidget", widgetSchema);

describe("soft-delete plugin", () => {
  beforeEach(async () => {
    await WidgetModel.deleteMany({ includeDeleted: true });
  });

  it("crea documentos con isDeleted=false por defecto", async () => {
    const doc = await WidgetModel.create({ _id: "w1", name: "A" });
    expect(doc.isDeleted).toBe(false);
  });

  it("oculta los borrados en find/findOne/countDocuments", async () => {
    await WidgetModel.create({ _id: "w1", name: "A" });
    await WidgetModel.create({ _id: "w2", name: "B" });

    const b = await WidgetModel.findOne({ _id: "w2" });
    await b!.softDelete();

    const all = await WidgetModel.find({});
    expect(all.map((d) => d._id)).toEqual(["w1"]);

    const hidden = await WidgetModel.findOne({ _id: "w2" });
    expect(hidden).toBeNull();

    const count = await WidgetModel.countDocuments({});
    expect(count).toBe(1);
  });

  it("softDelete marca isDeleted=true y deletedAt", async () => {
    const doc = await WidgetModel.create({ _id: "w1", name: "A" });
    await doc.softDelete();

    expect(doc.isDeleted).toBe(true);
    expect(doc.deletedAt).toBeInstanceOf(Date);
  });

  it("restore recupera el documento en las consultas activas", async () => {
    const doc = await WidgetModel.create({ _id: "w1", name: "A" });
    await doc.softDelete();

    const restored = await doc.restore();
    expect(restored.isDeleted).toBe(false);
    expect(restored.deletedAt).toBeNull();

    const found = await WidgetModel.findOne({ _id: "w1" });
    expect(found).not.toBeNull();
  });

  it("findIncludingDeleted y findDeleted acceden a los borrados", async () => {
    await WidgetModel.create({ _id: "w1", name: "A" });
    const doc = await WidgetModel.create({ _id: "w2", name: "B" });
    await doc.softDelete();

    const withDeleted = await WidgetModel.findIncludingDeleted();
    expect(withDeleted).toHaveLength(2);

    const deleted = await WidgetModel.findDeleted();
    expect(deleted.map((d) => d._id)).toEqual(["w2"]);
  });

  it("countActive y countIncludingDeleted distinguen estados", async () => {
    await WidgetModel.create({ _id: "w1", name: "A" });
    const doc = await WidgetModel.create({ _id: "w2", name: "B" });
    await doc.softDelete();

    expect(await WidgetModel.countActive()).toBe(1);
    expect(await WidgetModel.countIncludingDeleted()).toBe(2);
  });

  it("findOneAndUpdate ignora los borrados por defecto", async () => {
    await WidgetModel.create({ _id: "w1", name: "A" });
    const doc = await WidgetModel.create({ _id: "w2", name: "B" });
    await doc.softDelete();

    const updated = await WidgetModel.findOneAndUpdate(
      { _id: "w2" },
      { name: "B2" },
      { new: true }
    );
    expect(updated).toBeNull();
  });

  it("deletePermanently elimina incluso documentos borrados", async () => {
    const doc = await WidgetModel.create({ _id: "w1", name: "A" });
    await doc.softDelete();

    await WidgetModel.deletePermanently("w1");

    const withDeleted = await WidgetModel.findIncludingDeleted();
    expect(withDeleted).toHaveLength(0);
  });
});
