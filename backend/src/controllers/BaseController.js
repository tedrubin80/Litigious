const APIResponse = require('../lib/apiResponse');
const APIUtils = require('../lib/apiUtils');
const { APIError, ErrorHandler } = require('../middleware/errorHandler');

class BaseController {
  constructor(model, options = {}) {
    this.model = model;
    this.modelName = options.modelName || model.name || 'Resource';
    this.allowedFilters = options.allowedFilters || [];
    this.allowedSortFields = options.allowedSortFields || ['id', 'createdAt', 'updatedAt'];
    this.defaultSort = options.defaultSort || { createdAt: 'desc' };
    this.include = options.include || {};
    this.select = options.select || {};
    this.searchFields = options.searchFields || [];
    this.requiredCreateFields = options.requiredCreateFields || [];
    this.allowedCreateFields = options.allowedCreateFields || [];
    this.allowedUpdateFields = options.allowedUpdateFields || [];
  }

  // GET /resource - List resources with pagination, filtering, sorting
  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const query = APIUtils.buildPrismaQuery(req, {
      allowedFilters: this.allowedFilters,
      allowedSortFields: this.allowedSortFields,
      defaultSort: this.defaultSort,
      include: this.include,
      select: this.select
    });

    // Add search functionality
    const searchTerm = req.query.search;
    if (searchTerm && this.searchFields.length > 0) {
      const searchQuery = APIUtils.generateSearchQuery(searchTerm, this.searchFields);
      query.where = query.where ? { AND: [query.where, searchQuery] } : searchQuery;
    }

    // Add user-specific filtering if needed
    if (req.user && !['ADMIN'].includes(req.user.role)) {
      query.where = this.addUserFilter(query.where, req.user);
    }

    const result = await APIUtils.paginate(this.model, query);
    
    const response = APIResponse.paginated(
      result.data,
      result.pagination,
      `${this.modelName} list retrieved successfully`
    );

    res.json(response);
  });

  // GET /resource/:id - Get single resource
  getById = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const resource = await this.model.findUnique({
      where: { id },
      include: this.include,
      select: Object.keys(this.select).length > 0 ? this.select : undefined
    });

    if (!resource) {
      const response = APIResponse.notFound(this.modelName, id);
      return res.status(404).json(response);
    }

    // Check ownership if needed
    if (req.user && !['ADMIN'].includes(req.user.role)) {
      this.checkOwnership(resource, req.user);
    }

    const response = APIResponse.success(resource, `${this.modelName} retrieved successfully`);
    res.json(response);
  });

  // POST /resource - Create new resource
  create = ErrorHandler.asyncHandler(async (req, res) => {
    // Validate required fields
    const missingFields = APIUtils.validateRequiredFields(req.body, this.requiredCreateFields);
    if (missingFields.length > 0) {
      const response = APIResponse.validationError(missingFields);
      return res.status(400).json(response);
    }

    // Sanitize input data
    const sanitizedData = APIUtils.sanitizeObject(req.body, this.allowedCreateFields);
    
    // Add user context
    if (req.user) {
      sanitizedData.userId = req.user.userId;
    }

    // Pre-creation hook
    const processedData = await this.beforeCreate(sanitizedData, req);

    try {
      const resource = await this.model.create({
        data: processedData,
        include: this.include,
        select: Object.keys(this.select).length > 0 ? this.select : undefined
      });

      // Post-creation hook
      await this.afterCreate(resource, req);

      const response = APIResponse.created(resource, `${this.modelName} created successfully`);
      res.status(201).json(response);
    } catch (error) {
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new APIError(`${this.modelName} with this ${field} already exists`, 409);
      }
      throw error;
    }
  });

  // PUT /resource/:id - Update resource
  update = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check if resource exists
    const existingResource = await this.model.findUnique({ where: { id } });
    if (!existingResource) {
      const response = APIResponse.notFound(this.modelName, id);
      return res.status(404).json(response);
    }

    // Check ownership if needed
    if (req.user && !['ADMIN'].includes(req.user.role)) {
      this.checkOwnership(existingResource, req.user);
    }

    // Sanitize input data
    const sanitizedData = APIUtils.sanitizeObject(req.body, this.allowedUpdateFields);
    
    // Pre-update hook
    const processedData = await this.beforeUpdate(sanitizedData, existingResource, req);

    try {
      const resource = await this.model.update({
        where: { id },
        data: processedData,
        include: this.include,
        select: Object.keys(this.select).length > 0 ? this.select : undefined
      });

      // Post-update hook
      await this.afterUpdate(resource, existingResource, req);

      const response = APIResponse.updated(resource, `${this.modelName} updated successfully`);
      res.json(response);
    } catch (error) {
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new APIError(`${this.modelName} with this ${field} already exists`, 409);
      }
      throw error;
    }
  });

  // PATCH /resource/:id - Partial update
  patch = ErrorHandler.asyncHandler(async (req, res) => {
    // Reuse update logic for PATCH
    return this.update(req, res);
  });

  // DELETE /resource/:id - Delete resource
  delete = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const existingResource = await this.model.findUnique({ where: { id } });
    if (!existingResource) {
      const response = APIResponse.notFound(this.modelName, id);
      return res.status(404).json(response);
    }

    // Check ownership if needed
    if (req.user && !['ADMIN'].includes(req.user.role)) {
      this.checkOwnership(existingResource, req.user);
    }

    // Pre-deletion hook
    await this.beforeDelete(existingResource, req);

    await this.model.delete({ where: { id } });

    // Post-deletion hook
    await this.afterDelete(existingResource, req);

    const response = APIResponse.deleted(`${this.modelName} deleted successfully`);
    res.json(response);
  });

  // Bulk operations
  bulkCreate = ErrorHandler.asyncHandler(async (req, res) => {
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      throw new APIError('Items array is required and must not be empty', 400);
    }

    const result = await APIUtils.handleBulkOperation(
      this.model,
      'create',
      items.map(item => {
        const sanitized = APIUtils.sanitizeObject(item, this.allowedCreateFields);
        if (req.user) {
          sanitized.userId = req.user.userId;
        }
        return sanitized;
      }),
      {
        validateFn: (item) => {
          const errors = APIUtils.validateRequiredFields(item, this.requiredCreateFields);
          return { isValid: errors.length === 0, errors };
        }
      }
    );

    const response = APIResponse.success(result, 'Bulk create operation completed');
    res.json(response);
  });

  bulkUpdate = ErrorHandler.asyncHandler(async (req, res) => {
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      throw new APIError('Items array is required and must not be empty', 400);
    }

    const result = await APIUtils.handleBulkOperation(
      this.model,
      'update',
      items.map(item => APIUtils.sanitizeObject(item, this.allowedUpdateFields))
    );

    const response = APIResponse.success(result, 'Bulk update operation completed');
    res.json(response);
  });

  bulkDelete = ErrorHandler.asyncHandler(async (req, res) => {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new APIError('IDs array is required and must not be empty', 400);
    }

    const result = await APIUtils.handleBulkOperation(
      this.model,
      'delete',
      ids.map(id => ({ id }))
    );

    const response = APIResponse.success(result, 'Bulk delete operation completed');
    res.json(response);
  });

  // Hook methods (to be overridden by child controllers)
  async beforeCreate(data, req) {
    return data;
  }

  async afterCreate(resource, req) {
    // Override in child controllers
  }

  async beforeUpdate(data, existingResource, req) {
    return data;
  }

  async afterUpdate(resource, existingResource, req) {
    // Override in child controllers
  }

  async beforeDelete(resource, req) {
    // Override in child controllers
  }

  async afterDelete(resource, req) {
    // Override in child controllers
  }

  // User filtering (to be overridden by child controllers)
  addUserFilter(where, user) {
    // Default: filter by userId if the model has a userId field
    if (user.role !== 'ADMIN') {
      return { ...where, userId: user.userId };
    }
    return where;
  }

  // Ownership checking (to be overridden by child controllers)
  checkOwnership(resource, user) {
    if (user.role === 'ADMIN') {
      return true;
    }

    if (resource.userId && resource.userId !== user.userId) {
      throw new APIError('Access denied. You can only access your own resources.', 403);
    }

    return true;
  }

  // Generate express routes for this controller
  generateRoutes(router, options = {}) {
    const {
      prefix = '',
      middleware = [],
      exclude = [],
      customRoutes = {}
    } = options;

    const basePath = prefix ? `/${prefix}` : '';

    // Standard CRUD routes
    if (!exclude.includes('getAll')) {
      router.get(basePath, ...middleware, this.getAll);
    }
    
    if (!exclude.includes('getById')) {
      router.get(`${basePath}/:id`, ...middleware, this.getById);
    }
    
    if (!exclude.includes('create')) {
      router.post(basePath, ...middleware, this.create);
    }
    
    if (!exclude.includes('update')) {
      router.put(`${basePath}/:id`, ...middleware, this.update);
    }
    
    if (!exclude.includes('patch')) {
      router.patch(`${basePath}/:id`, ...middleware, this.patch);
    }
    
    if (!exclude.includes('delete')) {
      router.delete(`${basePath}/:id`, ...middleware, this.delete);
    }

    // Bulk operation routes
    if (!exclude.includes('bulkCreate')) {
      router.post(`${basePath}/bulk`, ...middleware, this.bulkCreate);
    }
    
    if (!exclude.includes('bulkUpdate')) {
      router.put(`${basePath}/bulk`, ...middleware, this.bulkUpdate);
    }
    
    if (!exclude.includes('bulkDelete')) {
      router.delete(`${basePath}/bulk`, ...middleware, this.bulkDelete);
    }

    // Add custom routes
    Object.entries(customRoutes).forEach(([path, handler]) => {
      const [method, routePath] = path.split(' ');
      router[method.toLowerCase()](`${basePath}${routePath}`, ...middleware, handler);
    });

    return router;
  }
}

module.exports = BaseController;