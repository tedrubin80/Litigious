class APIUtils {
  
  static parsePagination(req) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
  }

  static parseSort(req, allowedFields = [], defaultSort = { createdAt: 'desc' }) {
    const sortParam = req.query.sort;
    
    if (!sortParam) {
      return defaultSort;
    }
    
    // Parse sort parameter (e.g., "name,-createdAt,status")
    const sortFields = sortParam.split(',');
    const orderByArray = [];
    
    for (const field of sortFields) {
      let fieldName = field.trim();
      let direction = 'asc';
      
      if (fieldName.startsWith('-')) {
        direction = 'desc';
        fieldName = fieldName.slice(1);
      }
      
      // Only allow sorting on specified fields
      if (allowedFields.length === 0 || allowedFields.includes(fieldName)) {
        orderByArray.push({ [fieldName]: direction });
      }
    }
    
    // If we have multiple sort fields, return array; if one field, return object; if none, return default
    if (orderByArray.length > 1) {
      return orderByArray;
    } else if (orderByArray.length === 1) {
      return orderByArray[0];
    } else {
      return defaultSort;
    }
  }

  static parseFilters(req, allowedFilters = []) {
    const filters = {};
    
    for (const [key, value] of Object.entries(req.query)) {
      // Skip pagination and sorting parameters
      if (['page', 'limit', 'sort'].includes(key)) {
        continue;
      }
      
      // Only allow filtering on specified fields
      if (allowedFilters.length === 0 || allowedFilters.includes(key)) {
        filters[key] = this.parseFilterValue(key, value);
      }
    }
    
    return filters;
  }

  static parseFilterValue(key, value) {
    // Handle different filter operators
    if (typeof value === 'string') {
      // Range filters: field_gte, field_lte, field_gt, field_lt
      if (key.endsWith('_gte')) {
        return { gte: this.coerceValue(value) };
      }
      if (key.endsWith('_lte')) {
        return { lte: this.coerceValue(value) };
      }
      if (key.endsWith('_gt')) {
        return { gt: this.coerceValue(value) };
      }
      if (key.endsWith('_lt')) {
        return { lt: this.coerceValue(value) };
      }
      
      // Array filters: field_in
      if (key.endsWith('_in')) {
        return { in: value.split(',').map(v => this.coerceValue(v.trim())) };
      }
      
      // String contains filter
      if (key.endsWith('_contains')) {
        return { contains: value, mode: 'insensitive' };
      }
      
      // String starts with filter
      if (key.endsWith('_startsWith')) {
        return { startsWith: value, mode: 'insensitive' };
      }
      
      // String ends with filter
      if (key.endsWith('_endsWith')) {
        return { endsWith: value, mode: 'insensitive' };
      }
      
      // Not equal filter
      if (key.endsWith('_ne')) {
        return { not: this.coerceValue(value) };
      }
    }
    
    // Default: exact match
    return this.coerceValue(value);
  }

  static coerceValue(value) {
    // Try to convert string values to appropriate types
    if (typeof value !== 'string') {
      return value;
    }
    
    // Boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Null values
    if (value.toLowerCase() === 'null') return null;
    
    // Number values
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    
    if (/^\d*\.\d+$/.test(value)) {
      return parseFloat(value);
    }
    
    // Date values (ISO format)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value);
    }
    
    // Date values (simple format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(value);
    }
    
    return value;
  }

  static async paginate(model, options = {}) {
    const {
      where = {},
      orderBy = {},
      include = {},
      select = {},
      page = 1,
      limit = 10
    } = options;
    
    const offset = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      model.findMany({
        where,
        orderBy,
        include,
        select: Object.keys(select).length > 0 ? select : undefined,
        skip: offset,
        take: limit
      }),
      model.count({ where })
    ]);
    
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext,
        hasPrev
      }
    };
  }

  static buildPrismaQuery(req, options = {}) {
    const {
      allowedFilters = [],
      allowedSortFields = [],
      defaultSort = { createdAt: 'desc' },
      include = {},
      select = {}
    } = options;
    
    const pagination = this.parsePagination(req);
    const orderBy = this.parseSort(req, allowedSortFields, defaultSort);
    const filters = this.parseFilters(req, allowedFilters);
    
    // Build where clause
    const where = {};
    
    for (const [key, value] of Object.entries(filters)) {
      // Remove operator suffixes for the actual field name
      const fieldName = key.replace(/_(gte|lte|gt|lt|in|contains|startsWith|endsWith|ne)$/, '');
      where[fieldName] = value;
    }
    
    return {
      where,
      orderBy,
      include,
      select: Object.keys(select).length > 0 ? select : undefined,
      skip: pagination.offset,
      take: pagination.limit,
      pagination
    };
  }

  static validateRequiredFields(data, requiredFields) {
    const errors = [];
    
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push({
          field,
          message: `${field} is required`
        });
      }
    }
    
    return errors;
  }

  static sanitizeObject(obj, allowedFields) {
    if (!allowedFields || allowedFields.length === 0) {
      return obj;
    }
    
    const sanitized = {};
    
    for (const field of allowedFields) {
      if (obj.hasOwnProperty(field)) {
        sanitized[field] = obj[field];
      }
    }
    
    return sanitized;
  }

  static generateSearchQuery(searchTerm, searchFields) {
    if (!searchTerm || !searchFields || searchFields.length === 0) {
      return {};
    }
    
    const searchConditions = searchFields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    }));
    
    return {
      OR: searchConditions
    };
  }

  static async handleBulkOperation(model, operation, items, options = {}) {
    const { batchSize = 50, validateFn } = options;
    const results = [];
    const errors = [];
    
    // Process items in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      for (const item of batch) {
        try {
          // Validate item if validation function provided
          if (validateFn) {
            const validation = await validateFn(item);
            if (!validation.isValid) {
              errors.push({
                item,
                errors: validation.errors
              });
              continue;
            }
          }
          
          // Perform operation
          let result;
          switch (operation) {
            case 'create':
              result = await model.create({ data: item });
              break;
            case 'update':
              result = await model.update({
                where: { id: item.id },
                data: item
              });
              break;
            case 'delete':
              result = await model.delete({ where: { id: item.id } });
              break;
            default:
              throw new Error(`Unsupported operation: ${operation}`);
          }
          
          results.push(result);
        } catch (error) {
          errors.push({
            item,
            error: error.message
          });
        }
      }
    }
    
    return {
      results,
      errors,
      processed: results.length,
      failed: errors.length
    };
  }

  static generateCacheKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    const paramString = JSON.stringify(sortedParams);
    return `${prefix}:${Buffer.from(paramString).toString('base64')}`;
  }
}

module.exports = APIUtils;