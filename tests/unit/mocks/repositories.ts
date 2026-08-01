export const mockUserRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
};

export const mockProductRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  search: jest.fn(),
};

export const mockCartRepository = {
  findByUserId: jest.fn(),
  createCart: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
  clearCart: jest.fn(),
};

export const mockInventoryRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByProductId: jest.fn(),
  findLowStock: jest.fn(),
  decreaseStock: jest.fn(),
  restoreStock: jest.fn(),
  updateById: jest.fn(),
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
  findByUserId: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  deleteById: jest.fn(),
};

export const mockContactRepository = {
  create: jest.fn(),
};

export const mockUserService = {
  getAll: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
};

export const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  getMe: jest.fn(),
};

export const mockProductService = {
  getAll: jest.fn(),
  getById: jest.fn(),
};

export const mockCartService = {
  getCart: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
  clearCart: jest.fn(),
};

export const mockOrderService = {
  create: jest.fn(),
  findByUser: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
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
};

export const mockSearchService = {
  search: jest.fn(),
};

export const mockInventoryService = {
  getAll: jest.fn(),
  getById: jest.fn(),
  getByProductId: jest.fn(),
  getLowStock: jest.fn(),
  decreaseStock: jest.fn(),
  restoreStock: jest.fn(),
  adjustStock: jest.fn(),
};
