import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
	@Public()
	@Get('health')
	@ApiOperation({ summary: 'Liveness probe' })
	@ApiResponse({ status: 200, description: 'Service is up.' })
	checkHealth() {
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			uptimeSeconds: Math.round(process.uptime()),
		};
	}
}
