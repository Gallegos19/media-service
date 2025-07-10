import { app } from './app';
import { logger } from './shared/infrastructure/logger';
import { NODE_ENV, PORT } from './config';

// Import routes
import HealthRoutes from './infrastructure/web/health/health.routes';
import MediaRoutes from './infrastructure/web/media/media.routes';

// Importar configuración de la base de datos
import './infrastructure/config/Database';

async function startServer() {
  try {
    // Agregar rutas a la aplicación
    app.initializeRoutes([
      new MediaRoutes(),
      new HealthRoutes(),
    ]);

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
    // En producción, podrías querer reiniciar el proceso
    process.exit(1);
  }
});

// Manejo de promesas rechazadas no manejadas
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Promesa rechazada no manejada en:', promise, 'razón:', reason);
  if (NODE_ENV === 'production') {
    // En producción, podrías querer reiniciar el proceso
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
