import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DB_TIMEOUT_MS = 2000;

@Controller('health')
export class HealthController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	async check() {
		try {
			await Promise.race([
				this.prisma.$queryRaw`SELECT 1`,
				new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), DB_TIMEOUT_MS)),
			]);
			return { status: 'ok', database: 'up' };
		} catch {
			throw new ServiceUnavailableException({ status: 'error', database: 'down' });
		}
	}
}