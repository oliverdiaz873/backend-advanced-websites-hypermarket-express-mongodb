export const mockUserRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  findByEmail: jest.fn(),
  findIdsByNameOrEmail: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
};

export const mockCustomerRepository = {
  findPage: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  updateById: jest.fn(),
  updateStatus: jest.fn(),
  countAll: jest.fn(),
  countByStatus: jest.fn(),
  countNewThisMonth: jest.fn(),
};

export const mockProductRepository = {
  findAll: jest.fn(),
  findPage: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  findBySku: jest.fn(),
  existsByCategoryId: jest.fn(),
  existsByBrandId: jest.fn(),
  updateCategoryEmbeds: jest.fn(),
  updateBrandEmbeds: jest.fn(),
  search: jest.fn(),
  findIdsByNameOrSku: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  softDeleteById: jest.fn(),
  restoreById: jest.fn(),
};

export const mockCategoryRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findBySlug: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  softDeleteById: jest.fn(),
  restoreById: jest.fn(),
};

export const mockBrandRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findBySlug: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  softDeleteById: jest.fn(),
  restoreById: jest.fn(),
};

export const mockOfferRepository = {
    findAll: jest.fn(),
    findAllActive: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    softDeleteById: jest.fn(),
    restoreById: jest.fn(),
    findActiveByProductId: jest.fn(),
  };

export const mockCartRepository = {
    findByUserId: jest.fn(),
    createCart: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    clearCart: jest.fn(),
    mergeItems: jest.fn(),
  };

export const mockInventoryRepository = {
  findAll: jest.fn(),
  findPage: jest.fn(),
  findById: jest.fn(),
  findByProductId: jest.fn(),
  findByIds: jest.fn(),
  findLowStock: jest.fn(),
  findOutOfStock: jest.fn(),
  reserveStock: jest.fn(),
  releaseReservation: jest.fn(),
  completeReservation: jest.fn(),
  increaseById: jest.fn(),
  decreaseById: jest.fn(),
  setStockById: jest.fn(),
  setMinStockById: jest.fn(),
  create: jest.fn(),
  deleteByProductId: jest.fn(),
  deleteById: jest.fn(),
  deriveStatus: jest.fn((record: { stock: number; reservedStock: number; minStock?: number | null }) => {
    const available = record.stock - record.reservedStock;
    if (available <= 0) return "out-of-stock";
    if (record.minStock !== undefined && record.minStock !== null && record.stock <= record.minStock) {
      return "low-stock";
    }
    return "ok";
  }),
};

export const mockInventoryMovementRepository = {
  create: jest.fn(),
  findByInventoryId: jest.fn(),
  findPage: jest.fn(),
  deleteByInventoryId: jest.fn(),
  deleteByProductId: jest.fn(),
  isValidMovementType: jest.fn(),
};

export const mockInventoryMovementService = {
  record: jest.fn(),
  getByInventoryId: jest.fn(),
  getPage: jest.fn(),
  removeByProductId: jest.fn(),
  removeByInventoryId: jest.fn(),
};

export const mockAddressRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  setDefaultOnly: jest.fn(),
};

export const mockOrderRepository = {
  findAll: jest.fn(),
  findPage: jest.fn(),
  findByUserId: jest.fn(),
  findByUserAndIdempotencyKey: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  updatePaymentStatus: jest.fn(),
  findByOrderNumber: jest.fn(),
  deleteById: jest.fn(),
};

export const mockContactRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
};

export const mockUserService = {
  getAll: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
};

export const mockCustomerService = {
  getPage: jest.fn(),
  getById: jest.fn(),
  updateById: jest.fn(),
  updateStatus: jest.fn(),
  getStats: jest.fn(),
};

export const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  getMe: jest.fn(),
  updateMe: jest.fn(),
};

export const mockProductService = {
  getAll: jest.fn(),
  getPage: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  remove: jest.fn(),
  restore: jest.fn(),
};

export const mockCategoryService = {
  getAll: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  remove: jest.fn(),
  restore: jest.fn(),
};

export const mockBrandService = {
  getAll: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  remove: jest.fn(),
  restore: jest.fn(),
};

export const mockOfferService = {
  getAll: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  remove: jest.fn(),
  restore: jest.fn(),
};

export const mockCartService = {
    getCart: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    clearCart: jest.fn(),
    mergeCart: jest.fn(),
  };

export const mockOrderService = {
  create: jest.fn(),
  findByUser: jest.fn(),
  findById: jest.fn(),
  pay: jest.fn(),
  updateStatus: jest.fn(),
  getPageAdmin: jest.fn(),
  getByIdAdmin: jest.fn(),
  updateStatusAdmin: jest.fn(),
};

export const mockAddressService = {
  getById: jest.fn(),
  getByUser: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
};

export const mockContactService = {
  create: jest.fn(),
  findAllAdmin: jest.fn(),
  findByIdAdmin: jest.fn(),
  updateStatusAdmin: jest.fn(),
  remove: jest.fn(),
};

export const mockSearchService = {
  search: jest.fn(),
};

export const mockInventoryService = {
  getAll: jest.fn(),
  getPage: jest.fn(),
  getById: jest.fn(),
  getByProductId: jest.fn(),
  getLowStock: jest.fn(),
  getOutOfStock: jest.fn(),
  reserveForOrder: jest.fn(),
  reserveStock: jest.fn(),
  releaseReservation: jest.fn(),
  completeReservation: jest.fn(),
  adjustInventory: jest.fn(),
  changeMinStock: jest.fn(),
  getMovements: jest.fn(),
  createForProduct: jest.fn(),
  removeByProductId: jest.fn(),
};

export const mockStatsRepository = {
  findProductIdsByCategory: jest.fn(),
  countOrders: jest.fn(),
  countOrdersByStatus: jest.fn(),
  countOrdersSince: jest.fn(),
  countPendingOrders: jest.fn(),
  countCustomers: jest.fn(),
  countNewCustomersSince: jest.fn(),
  countProducts: jest.fn(),
  countLowStock: jest.fn(),
  countOutOfStock: jest.fn(),
  countPendingContactMessages: jest.fn(),
  sumRevenueSince: jest.fn(),
  sumRevenue: jest.fn(),
  sumRevenueByDay: jest.fn(),
  topProductsByQuantity: jest.fn(),
  sumRevenueByCategory: jest.fn(),
  inventorySummary: jest.fn(),
};

export const mockStatsService = {
  parseStatsQuery: jest.fn(),
  getOverview: jest.fn(),
  getDashboard: jest.fn(),
  getRevenueSeries: jest.fn(),
  getOrdersByStatus: jest.fn(),
  getTopProducts: jest.fn(),
  getCategorySales: jest.fn(),
  getInventorySummary: jest.fn(),
};

export const mockAuditRepository = {
  create: jest.fn(),
  findPage: jest.fn(),
  find: jest.fn(),
};

export const mockAuditService = {
  getPage: jest.fn(),
  getById: jest.fn(),
};
