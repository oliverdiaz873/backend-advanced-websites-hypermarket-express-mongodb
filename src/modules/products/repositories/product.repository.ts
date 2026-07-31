import productsRaw from "../data/products.data";
import type { Product } from "../../../types";

const productsMapped: Product[] = productsRaw.map((p) => {
  const categorySlug = p.category;
  let categoryName = "Otros";
  if (categorySlug === "bebidas") categoryName = "Bebidas";
  else if (categorySlug === "carnes-pescados-mariscos") categoryName = "Carnes, Pescados y Mariscos";
  else if (categorySlug === "despensa") categoryName = "Despensa";
  else if (categorySlug === "enlatados") categoryName = "Enlatados";
  else if (categorySlug === "frutas-y-verduras") categoryName = "Frutas y Verduras";
  else if (categorySlug === "lacteos-y-huevos") categoryName = "Lácteos y Huevos";
  else if (categorySlug === "climatizacion") categoryName = "Climatización";
  else if (categorySlug === "cocina") categoryName = "Cocina";
  else if (categorySlug === "lavado") categoryName = "Lavado";
  else if (categorySlug === "analgesicos") categoryName = "Analgésicos";
  else if (categorySlug === "antigripales-y-resfriado") categoryName = "Antigripales";
  else if (categorySlug === "dermocosmetica") categoryName = "Dermocosmética";
  else if (categorySlug === "vitaminas-y-minerales") categoryName = "Vitaminas y Minerales";
  else if (categorySlug === "electricidad") categoryName = "Electricidad";
  else if (categorySlug === "herramientas-manuales") categoryName = "Herramientas Manuales";
  else if (categorySlug === "pinturas-y-acabados") categoryName = "Pinturas";
  else if (categorySlug === "juguetes-para-ninas") categoryName = "Juguetes para Niñas";
  else if (categorySlug === "juguetes-para-ninos") categoryName = "Juguetes para Niños";
  else if (categorySlug === "floreros") categoryName = "Floreros";
  else if (categorySlug === "mesas") categoryName = "Mesas";
  else if (categorySlug === "sillones") categoryName = "Sillones";
  else if (categorySlug === "sofas") categoryName = "Sofás";
  else if (categorySlug === "pantalones-para-hombres") categoryName = "Pantalones para Hombres";
  else if (categorySlug === "pantalones-para-mujeres") categoryName = "Pantalones para Mujeres";
  else if (categorySlug === "pantalones-para-ninos") categoryName = "Pantalones para Niños";
  else if (categorySlug === "trajes-para-hombres") categoryName = "Trajes para Hombres";
  else if (categorySlug === "vestidos") categoryName = "Vestidos";
  else if (categorySlug === "bocinas") categoryName = "Bocinas";
  else if (categorySlug === "celulares") categoryName = "Celulares";
  else if (categorySlug === "laptops") categoryName = "Laptops";
  else if (categorySlug === "tablets") categoryName = "Tablets";
  else if (categorySlug === "televisores") categoryName = "Televisores";

  return {
    id: p.id,
    sku: `sku-${p.id}`,
    name: p.name,
    description: `Detalle de ${p.name}`,
    price: p.price,
    image: p.image,
    categoryId: p.category,
    category: {
      name: categoryName,
      slug: categorySlug
    },
    unit: p.unit || undefined,
    unitQuantity: p.unitQuantity || undefined,
    status: "active",
    isAvailable: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01")
  };
});

export const findAll = (): Product[] => {
  return productsMapped;
};

export const findById = (id: string): Product | null => {
  return productsMapped.find((p) => p.id === id) || null;
};

