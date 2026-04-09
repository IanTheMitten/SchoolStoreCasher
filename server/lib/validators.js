/**
 * Validation utilities for request bodies
 */

export const validateProduct = (body) => {
  const errors = [];
  
  if (body.name && typeof body.name !== 'string') {
    errors.push('name must be a string');
  }
  
  if (body.price !== undefined) {
    if (typeof body.price !== 'number' || body.price < 0) {
      errors.push('price must be a non-negative number');
    }
  }
  
  if (body.unit_cost !== undefined) {
    if (typeof body.unit_cost !== 'number' || body.unit_cost < 0) {
      errors.push('unit_cost must be a non-negative number');
    }
  }
  
  if (body.stock !== undefined) {
    if (!Number.isInteger(body.stock) || body.stock < 0) {
      errors.push('stock must be a non-negative integer');
    }
  }
  
  if (body.sku && typeof body.sku !== 'string') {
    errors.push('sku must be a string');
  }
  
  if (body.category && typeof body.category !== 'string') {
    errors.push('category must be a string');
  }
  
  return errors;
};

export const validateStudent = (body) => {
  const errors = [];
  
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string');
  }
  
  if (body.grade && typeof body.grade !== 'string') {
    errors.push('grade must be a string');
  }

  if (body.barcode !== undefined && body.barcode !== null && typeof body.barcode !== 'string') {
    errors.push('barcode must be a string');
  }
  
  return errors;
};

export const validateSale = (body) => {
  const errors = [];
  
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    errors.push('items is required and must be a non-empty array');
    return errors; // Early return if items invalid
  }
  
  body.items.forEach((item, index) => {
    if (!item.productId || typeof item.productId !== 'string') {
      errors.push(`items[${index}].productId is required and must be a string`);
    }
    
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      errors.push(`items[${index}].quantity must be a positive integer`);
    }
    
    if (item.unitPrice !== undefined) {
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        errors.push(`items[${index}].unitPrice must be a non-negative number`);
      }
    }
  });
  
  const validPaymentMethods = ['cash', 'card', 'student_balance', 'student_id'];
  if (body.paymentMethod && !validPaymentMethods.includes(body.paymentMethod)) {
    errors.push(`paymentMethod must be one of: ${validPaymentMethods.join(', ')}`);
  }
  
  if (body.studentId !== null && body.studentId !== undefined && typeof body.studentId !== 'string') {
    errors.push('studentId must be a string or null');
  }
  
  if (body.studentName !== null && body.studentName !== undefined && typeof body.studentName !== 'string') {
    errors.push('studentName must be a string or null');
  }
  
  return errors;
};

export const validateExpense = (body) => {
  const errors = [];
  
  if (typeof body.amount !== 'number' || body.amount <= 0) {
    errors.push('amount is required and must be a positive number');
  }
  
  if (body.category && typeof body.category !== 'string') {
    errors.push('category must be a string');
  }
  
  if (body.note && typeof body.note !== 'string') {
    errors.push('note must be a string');
  }
  
  if (body.related_product_id && typeof body.related_product_id !== 'string') {
    errors.push('related_product_id must be a string');
  }
  
  return errors;
};

export const validateStockAdjustment = (body) => {
  const errors = [];
  
  if (!Number.isInteger(body.change) || body.change === 0) {
    errors.push('change is required and must be a non-zero integer');
  }
  
  if (body.reason && typeof body.reason !== 'string') {
    errors.push('reason must be a string');
  }
  
  if (body.unit_cost !== undefined) {
    if (typeof body.unit_cost !== 'number' || body.unit_cost < 0) {
      errors.push('unit_cost must be a non-negative number');
    }
  }
  
  if (body.reference && typeof body.reference !== 'string') {
    errors.push('reference must be a string');
  }
  
  return errors;
};
