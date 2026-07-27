const categories = [
  {
    id: 'alimentos',
    name: 'Alimentos',
    subcategories: [
      { name: 'Frutas y Verduras', slug: 'frutas-y-verduras' },
      { name: 'Despensa', slug: 'despensa' },
      { name: 'Carnes, Pescados y Mariscos', slug: 'carnes-pescados-mariscos' },
      { name: 'Lácteos y Huevos', slug: 'lacteos-y-huevos' },
      { name: 'Bebidas', slug: 'bebidas' },
      { name: 'Enlatados', slug: 'enlatados' },
    ],
  },
  {
    id: 'electrodomesticos',
    name: 'Electrodomésticos',
    subcategories: [
      { name: 'Cocina', slug: 'cocina' },
      { name: 'Lavado', slug: 'lavado' },
      { name: 'Climatización', slug: 'climatizacion' },
    ],
  },
  {
    id: 'tecnologia',
    name: 'Tecnología',
    subcategories: [
      { name: 'Televisores', slug: 'televisores' },
      { name: 'Laptops', slug: 'laptops' },
      { name: 'Tablets', slug: 'tablets' },
      { name: 'Celulares', slug: 'celulares' },
      { name: 'Bocinas', slug: 'bocinas' },
    ],
  },
  {
    id: 'ropa',
    name: 'Ropa',
    subcategories: [
      { name: 'Pantalones para Hombres', slug: 'pantalones-para-hombres' },
      { name: 'Pantalones para Mujeres', slug: 'pantalones-para-mujeres' },
      { name: 'Pantalones para Niños', slug: 'pantalones-para-ninos' },
      { name: 'Trajes para Hombres', slug: 'trajes-para-hombres' },
      { name: 'Vestidos', slug: 'vestidos' },
    ],
  },
  {
    id: 'muebles-y-decoracion',
    name: 'Muebles y Decoración',
    subcategories: [
      { name: 'Sofás', slug: 'sofas' },
      { name: 'Sillones', slug: 'sillones' },
      { name: 'Mesas', slug: 'mesas' },
      { name: 'Floreros', slug: 'floreros' },
    ],
  },
  {
    id: 'farmacia',
    name: 'Farmacia',
    subcategories: [
      { name: 'Analgésicos', slug: 'analgesicos' },
      { name: 'Dermocosmética', slug: 'dermocosmetica' },
      { name: 'Vitaminas y Minerales', slug: 'vitaminas-y-minerales' },
      { name: 'Antigripales', slug: 'antigripales-y-resfriado' },
    ],
  },
  {
    id: 'ferreteria',
    name: 'Ferretería',
    subcategories: [
      { name: 'Herramientas Manuales', slug: 'herramientas-manuales' },
      { name: 'Pinturas', slug: 'pinturas-y-acabados' },
      { name: 'Electricidad', slug: 'electricidad' },
      { name: 'Plomería', slug: 'plomeria' },
    ],
  },
  {
    id: 'juguetes',
    name: 'Juguetes',
    subcategories: [
      { name: 'Juguetes para Niños', slug: 'juguetes-para-ninos' },
      { name: 'Juguetes para Niñas', slug: 'juguetes-para-ninas' },
    ],
  },
];

module.exports = categories;