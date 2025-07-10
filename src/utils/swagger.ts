import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import { API_DOCS_PATH, NODE_ENV } from '../config';
import { version } from '../../package.json';

export const setupSwagger = (app: Application) => {
  if (NODE_ENV === 'production') return;

  const options: swaggerJSDoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Media Service API',
        version,
        description: 'API para la gestión de archivos multimedia',
        contact: {
          name: 'Soporte Técnico',
          email: 'soporte@ejemplo.com',
        },
      },
      servers: [
        {
          url: 'http://localhost:3003',
          description: 'Servidor de desarrollo',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Ingrese el token JWT en el formato: Bearer <token>'
          }
        },
        schemas: {
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              status: { type: 'integer', example: 400 },
              errorCode: { type: 'string', example: 'ERROR_CODE' },
              message: { type: 'string', example: 'Mensaje de error descriptivo' },
              errors: { type: 'object', example: { field: ['Error de validación'] } },
              stack: { type: 'string', example: 'Error stack trace (solo en desarrollo)' }
            }
          },
          MediaFile: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
              originalName: { type: 'string', example: 'imagen.jpg' },
              fileType: { type: 'string', example: 'image/jpeg' },
              mimeType: { type: 'string', example: 'image/jpeg' },
              fileSize: { type: 'integer', example: 1024 },
              category: { 
                type: 'string', 
                enum: ['image', 'video', 'audio', 'document', 'other'],
                example: 'image'
              },
              publicUrl: { type: 'string', format: 'uri', example: 'https://example.com/files/123.jpg' },
              isPublic: { type: 'boolean', example: false },
              isProcessed: { type: 'boolean', example: true },
              virusScanStatus: { 
                type: 'string', 
                enum: ['pending', 'clean', 'infected', 'failed'],
                example: 'clean'
              },
              metadata: { type: 'object', example: { width: 800, height: 600 } },
              userId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
              createdAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' }
            }
          }
        },
        responses: {
          UnauthorizedError: {
            description: 'Token inválido o no proporcionado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
                example: {
                  success: false,
                  status: 401,
                  errorCode: 'UNAUTHORIZED',
                  message: 'No se proporcionó un token de autenticación válido'
                }
              }
            }
          },
          ValidationError: {
            description: 'Error de validación',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
                example: {
                  success: false,
                  status: 422,
                  errorCode: 'VALIDATION_ERROR',
                  message: 'Error de validación',
                  errors: {
                    field: ['El campo es requerido']
                  }
                }
              }
            }
          },
          NotFoundError: {
            description: 'Recurso no encontrado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
                example: {
                  success: false,
                  status: 404,
                  errorCode: 'NOT_FOUND',
                  message: 'El recurso solicitado no existe'
                }
              }
            }
          }
        }
      }
    },
    apis: [
      'src/infrastructure/web/**/*.ts',
      'src/infrastructure/web/**/*.js'
    ]
  };

  const specs = swaggerJSDoc(options);
  
  // Serve Swagger UI
  app.use(
    API_DOCS_PATH,
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customSiteTitle: 'Media Service API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
      customfavIcon: '/favicon.ico',
    })
  );

  // Docs in JSON format
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log(`📚 API Documentation available at http://localhost:${process.env.PORT || 3000}${API_DOCS_PATH}`);
};
