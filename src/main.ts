import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
	const logger = new Logger('Bootstrap');
	const app = await NestFactory.create(AppModule);

	const configService = app.get(ConfigService);

	app.enableCors({
		origin: '*',
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
		credentials: true,
		allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
	});

	app.use(helmet({ contentSecurityPolicy: false }));

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
		}),
	);

	// Graceful shutdown: closes BullMQ workers and Mongo connections cleanly.
	app.enableShutdownHooks();

	const swaggerConfig = new DocumentBuilder()
		.setTitle('Marqet API')
		.setDescription(
			'Marketplace API — one account buys and sells. Products carry real-world dimensions that are used to ' +
				'scale-correct AI-generated 3D models (Tripo). NAFDAC-regulated categories require a valid NAFDAC number. ',
		)
		.setVersion('1.0')
		.addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
		.build();
	const document = SwaggerModule.createDocument(app, swaggerConfig);
	SwaggerModule.setup('api/docs', app, document);

	const port = configService.get<number>('PORT') ?? 3000;
	await app.listen(port);
	logger.log(`ENV: ${configService.get('NODE_ENV')} | Server on http://localhost:${port} | Docs at /api/docs`);
}

void bootstrap();
