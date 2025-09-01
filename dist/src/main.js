"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const path_1 = require("path");
const stripe_config_1 = require("./config/stripe.config");
const configuration_service_1 = require("./config/configuration.service");
async function bootstrap() {
    const stripeConfigured = (0, stripe_config_1.validateStripeConfig)();
    if (!stripeConfigured) {
        console.warn('⚠️ Stripe configuration missing - billing features will be disabled');
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(configuration_service_1.ConfigurationService);
    try {
        await configService.initializeDefaultConfigurations();
    }
    catch (error) {
        console.warn('⚠️ Failed to initialize default configurations:', error.message);
    }
    const uploadsPath = (0, path_1.join)(process.cwd(), 'uploads');
    app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });
    const corsOrigins = await configService.getConfiguration('CORS_ORIGINS');
    const allowedOrigins = corsOrigins
        ? corsOrigins.split(',').map(origin => origin.trim())
        : ['http://localhost:5000'];
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
    });
    const port = process.env.PORT || 4000;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Application is running on: http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map