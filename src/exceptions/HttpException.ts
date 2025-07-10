export class HttpException extends Error {
  public status: number;
  public errorCode: string;
  public errors: any;

  constructor(status: number, message: string, errorCode: string = 'INTERNAL_SERVER_ERROR', errors: any = {}) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.errors = errors;
    
    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, HttpException.prototype);
  }
}

// Common HTTP exceptions
export class BadRequestException extends HttpException {
  constructor(message: string = 'Bad Request', errors: any = {}) {
    super(400, message, 'BAD_REQUEST', errors);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Unauthorized', errors: any = {}) {
    super(401, message, 'UNAUTHORIZED', errors);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = 'Forbidden', errors: any = {}) {
    super(403, message, 'FORBIDDEN', errors);
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = 'Not Found', errors: any = {}) {
    super(404, message, 'NOT_FOUND', errors);
  }
}

export class ConflictException extends HttpException {
  constructor(message: string = 'Conflict', errors: any = {}) {
    super(409, message, 'CONFLICT', errors);
  }
}

export class ValidationException extends HttpException {
  constructor(message: string = 'Validation Error', errors: any = {}) {
    super(422, message, 'VALIDATION_ERROR', errors);
  }
}

export class TooManyRequestsException extends HttpException {
  constructor(message: string = 'Too Many Requests', errors: any = {}) {
    super(429, message, 'TOO_MANY_REQUESTS', errors);
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(message: string = 'Internal Server Error', errors: any = {}) {
    super(500, message, 'INTERNAL_SERVER_ERROR', errors);
  }
}

export class ServiceUnavailableException extends HttpException {
  constructor(message: string = 'Service Unavailable', errors: any = {}) {
    super(503, message, 'SERVICE_UNAVAILABLE', errors);
  }
}
