import { app } from './app';
import { logger } from './shared/infrastructure/logger';
import { NODE_ENV, PORT } from '@config';

// Import routes
import HealthRoutes from '@infrastructure/web/health/health.routes';
import MediaRoutes from '@infrastructure/web/media/media.routes';

// Importar configuración de la base de datos
import '@infrastructure/config/Database';

async function startServer() {
  try {
    // Create route instances
    const healthRoutes = new HealthRoutes();
    const mediaRoutes = new MediaRoutes();
    
    logger.info('Route instances created');
    logger.info(`HealthRoutes path: ${healthRoutes.path}`);
    logger.info(`MediaRoutes path: ${mediaRoutes.path}`);
    
    // ¡IMPORTANTE! Agregar rutas a la aplicación DESPUÉS de crear la app
    // pero ANTES de iniciar el servidor
    app.initializeRoutes([
      mediaRoutes,
      healthRoutes,
    ]);

    // Debug: Log all registered routes
    logger.info('=== All Express Routes ===');
    const router = app.getServer()._router;
    if (router && router.stack) {
      router.stack.forEach((layer: any, index: number) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
          logger.info(`${index}: ${methods} ${layer.route.path}`);
        } else if (layer.name === 'router' && layer.regexp) {
          logger.info(`${index}: Router middleware - ${layer.regexp}`);
          if (layer.handle && layer.handle.stack) {
            layer.handle.stack.forEach((subLayer: any, subIndex: number) => {
              if (subLayer.route) {
                const methods = Object.keys(subLayer.route.methods).join(', ').toUpperCase();
                logger.info(`  ${index}.${subIndex}: ${methods} ${subLayer.route.path}`);
              }
            });
          }
        } else {
          logger.info(`${index}: ${layer.name || 'unnamed'} middleware`);
        }
      });
    } else {
      logger.error('No router found or router has no stack');
    }
    logger.info('=== End Routes ===');

    // Iniciar el servidor
    await app.listen();
    
    logger.info(`Servidor escuchando en el puerto ${PORT}`);
  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejo de errores no capturados
process.on('uncaughtException', (error: Error) => {
  logger.error('Excepción no capturada:', error);
  if (NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Manejo de promesas rechazadas no manejadas
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Promesa rechazada no manejada en:', promise, 'razón:', reason);
  if (NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Manejo de señales de terminación
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach(signal => {
  process.on(signal, async () => {
    logger.info(`\nRecibida señal ${signal}. Cerrando el servidor...`);
    try {
      await app.close();
      logger.info('Servidor cerrado correctamente');
      process.exit(0);
    } catch (error) {
      logger.error('Error al cerrar el servidor:', error);
      process.exit(1);
    }
  });
});

// Iniciar el servidor
startServer().catch(error => {
  logger.error('Error al iniciar la aplicación:', error);
  process.exit(1);
});