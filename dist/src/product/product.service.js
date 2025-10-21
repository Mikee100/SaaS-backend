"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const XLSX = require("xlsx");
const uuid_1 = require("uuid");
const audit_log_service_1 = require("../audit-log.service");
const qrcode = require("qrcode");
const billing_service_1 = require("../billing/billing.service");
const subscription_service_1 = require("../billing/subscription.service");
const fs = require("fs");
const path = require("path");
const sharp_1 = require("sharp");
const bulkUploadProgress = {};
function findColumnMatch(headers, candidates) {
    for (const candidate of candidates) {
        const exact = headers.find((h) => h.toLowerCase() === candidate.toLowerCase());
        if (exact)
            return exact;
        const partial = headers.find((h) => h.toLowerCase().includes(candidate.toLowerCase()));
        if (partial)
            return partial;
    }
    return undefined;
}
let ProductService = class ProductService {
    prisma;
    auditLogService;
    billingService;
    subscriptionService;
    async findAllByBranch(branchId, tenantId) {
        console.log('------------------------------');
        console.log('[ProductService] Filtering products by branchId:', branchId, 'tenantId:', tenantId);
        console.log('------------------------------');
        return this.prisma.product.findMany({
            where: { branchId, tenantId },
            include: {
                supplier: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    constructor(prisma, auditLogService, billingService, subscriptionService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
        this.billingService = billingService;
        this.subscriptionService = subscriptionService;
    }
    async findAllByTenantAndBranch(tenantId, branchId) {
        const where = { tenantId };
        if (branchId) {
            where.OR = [
                { branchId: branchId },
                { branchId: null }
            ];
        }
        return this.prisma.product.findMany({
            where,
            include: {
                supplier: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createProduct(data, actorUserId, ip) {
        const canAddProduct = await this.subscriptionService.canAddProduct(data.tenantId);
        if (!canAddProduct) {
            const subscription = await this.subscriptionService.getCurrentSubscription(data.tenantId);
            const maxProducts = subscription.plan?.maxProducts || 0;
            throw new common_1.BadRequestException(`Product limit exceeded. Your plan allows up to ${maxProducts} products. Please upgrade your plan to add more products.`);
        }
        const productData = {
            ...data,
            id: (0, uuid_1.v4)(),
        };
        if (typeof productData.supplier === 'string') {
            if (productData.supplier) {
                const supplier = await this.prisma.supplier.findFirst({
                    where: {
                        name: productData.supplier,
                        tenantId: data.tenantId,
                    },
                });
                if (supplier) {
                    productData.supplierId = supplier.id;
                }
            }
            delete productData.supplier;
        }
        if (productData.stock !== undefined) {
            productData.stock = parseInt(String(productData.stock), 10);
            if (isNaN(productData.stock)) {
                productData.stock = 0;
            }
        }
        if (productData.price !== undefined && productData.price !== null && productData.price !== '') {
            const parsedPrice = parseFloat(String(productData.price));
            productData.price = isNaN(parsedPrice) ? 0 : parsedPrice;
        }
        else {
            productData.price = 0;
        }
        if (productData.cost !== undefined) {
            productData.cost = parseFloat(String(productData.cost));
        }
        let variations = [];
        if (productData.variations && Array.isArray(productData.variations)) {
            variations = productData.variations.map((variation) => ({
                ...variation,
                id: (0, uuid_1.v4)(),
                tenantId: data.tenantId,
                branchId: data.branchId,
            }));
            delete productData.variations;
        }
        delete productData.manage_stock;
        delete productData.type;
        delete productData.category;
        delete productData.industry;
        delete productData.attributes;
        delete productData.branchId;
        delete productData.tenantId;
        productData.hasVariations = variations.length > 0;
        const product = await this.prisma.product.create({
            data: {
                ...productData,
                tenant: {
                    connect: { id: data.tenantId }
                },
                branch: {
                    connect: { id: data.branchId }
                },
                variations: {
                    create: variations,
                },
            },
            include: {
                variations: true,
                category: true,
                tenant: true,
                branch: true,
            },
        });
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'product_created', { productId: product.id, name: product.name, sku: product.sku, hasVariations: product.hasVariations }, ip);
        }
        return product;
    }
    async updateProduct(id, data, tenantId, actorUserId, ip) {
        const { name, sku, price, description, stock, cost, supplier, categoryId, variations, ...customFields } = data;
        const updateData = {};
        if (supplier !== undefined) {
            if (supplier && typeof supplier === 'string') {
                const supplierRecord = await this.prisma.supplier.findFirst({
                    where: {
                        name: supplier,
                        tenantId: tenantId,
                    },
                });
                if (supplierRecord) {
                    updateData.supplierId = supplierRecord.id;
                }
                else {
                    updateData.supplierId = null;
                }
            }
            else {
                updateData.supplierId = null;
            }
        }
        if (name !== undefined)
            updateData.name = name;
        if (sku !== undefined)
            updateData.sku = String(sku);
        if (price !== undefined)
            updateData.price = parseFloat(price);
        if (description !== undefined)
            updateData.description = description;
        if (stock !== undefined)
            updateData.stock = parseInt(stock);
        if (cost !== undefined)
            updateData.cost = parseFloat(cost);
        if (categoryId !== undefined)
            updateData.categoryId = categoryId;
        if (Object.keys(customFields).length > 0) {
            updateData.customFields = customFields;
        }
        if (variations !== undefined) {
            await this.prisma.productVariation.deleteMany({
                where: { productId: id, tenantId },
            });
            if (Array.isArray(variations) && variations.length > 0) {
                updateData.variations = {
                    create: variations.map((variation) => ({
                        ...variation,
                        id: (0, uuid_1.v4)(),
                        tenantId,
                    })),
                };
                updateData.hasVariations = true;
            }
            else {
                updateData.hasVariations = false;
            }
        }
        const result = await this.prisma.product.updateMany({
            where: { id, tenantId },
            data: updateData,
        });
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'product_updated', { productId: id, updatedFields: data }, ip);
        }
        return result;
    }
    async deleteProduct(id, tenantId, actorUserId, ip) {
        const result = await this.prisma.product.deleteMany({
            where: { id, tenantId },
        });
        if (this.auditLogService) {
            await this.auditLogService.log(actorUserId || null, 'product_deleted', { productId: id }, ip);
        }
        return result;
    }
    async bulkUpload(file, user, uploadId) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
            defval: '',
        });
        if (rows.length === 0) {
            return {
                summary: [{ status: 'error', error: 'No data found in file.' }],
            };
        }
        if (!uploadId)
            uploadId = (0, uuid_1.v4)();
        bulkUploadProgress[uploadId] = { processed: 0, total: rows.length };
        let branchId = user.branchId || user.selectedBranchId;
        if (!branchId) {
            const branch = await this.prisma.branch.findFirst({
                where: { tenantId: user.tenantId },
                select: { id: true },
            });
            if (branch) {
                branchId = branch.id;
            }
            else {
                throw new Error('No branch found. Please create a branch before uploading products.');
            }
        }
        console.log(`Using branch ID for bulk upload: ${branchId}`);
        const bulkUploadRecord = await this.prisma.bulkUploadRecord.create({
            data: {
                tenantId: user.tenantId,
                branchId: branchId,
                userId: user.userId,
                totalProducts: rows.length,
                totalValue: 0,
                status: 'processing',
            },
        });
        const headers = Object.keys(rows[0]);
        const nameCandidates = [
            'name',
            'product name',
            'item name',
            'description',
            'title',
        ];
        const skuCandidates = [
            'sku',
            'product id',
            'product code',
            'partnumber',
            'part number',
            'code',
            'id',
        ];
        const priceCandidates = [
            'price',
            'unit price',
            'selling price',
            'sale price',
            'price usd',
            'amount',
        ];
        const costCandidates = [
            'cost',
            'purchase cost',
            'unit cost',
            'buy price',
            'cost price',
            'wholesale price',
        ];
        const nameCol = findColumnMatch(headers, nameCandidates);
        const skuCol = findColumnMatch(headers, skuCandidates);
        const priceCol = findColumnMatch(headers, priceCandidates);
        const costCol = findColumnMatch(headers, costCandidates);
        const requiredFields = ['name', 'sku', 'price'];
        const results = [];
        const createdProducts = [];
        const BATCH_SIZE = 10;
        let successfulCount = 0;
        let failedCount = 0;
        try {
            for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
                const batchEnd = Math.min(batchStart + BATCH_SIZE, rows.length);
                const batch = rows.slice(batchStart, batchEnd);
                console.log(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: rows ${batchStart + 1}-${batchEnd}`);
                await this.prisma.$transaction(async (prisma) => {
                    for (const [batchIndex, row] of batch.entries()) {
                        const globalIndex = batchStart + batchIndex;
                        try {
                            const mappedRow = { ...row };
                            if (nameCol)
                                mappedRow.name = row[nameCol];
                            if (skuCol)
                                mappedRow.sku = row[skuCol];
                            if (priceCol)
                                mappedRow.price = row[priceCol];
                            if (costCol)
                                mappedRow.cost = row[costCol];
                            for (const field of requiredFields) {
                                if (!mappedRow[field])
                                    throw new Error(`Missing required field: ${field}`);
                            }
                            const { name, sku, price, cost, description, stock, supplierId: extractedSupplierId, ...customFields } = mappedRow;
                            const productData = {
                                id: (0, uuid_1.v4)(),
                                name: String(name).trim(),
                                sku: sku !== undefined ? String(sku).trim() : '',
                                price: parseFloat(price),
                                cost: cost !== undefined ? parseFloat(String(cost)) : 0,
                                description: description ? String(description).trim() : '',
                                stock: stock !== undefined ? parseInt(String(stock)) : 0,
                                tenantId: user.tenantId,
                                branchId: branchId,
                                supplierId: extractedSupplierId || null,
                                bulkUploadRecordId: bulkUploadRecord.id,
                                ...(Object.keys(customFields).length > 0 && { customFields }),
                            };
                            console.log('Creating product:', productData);
                            const createdProduct = await prisma.product.create({
                                data: productData,
                            });
                            createdProducts.push(createdProduct);
                            results.push({ row: mappedRow, status: 'success' });
                            successfulCount++;
                        }
                        catch (error) {
                            console.error('Error processing row:', error);
                            results.push({ row, status: 'error', error: error.message });
                            failedCount++;
                        }
                        finally {
                            bulkUploadProgress[uploadId].processed = globalIndex + 1;
                        }
                    }
                });
            }
            if (this.auditLogService) {
                await this.auditLogService.log(user.userId || null, 'products_bulk_upload', {
                    total: rows.length,
                    successful: successfulCount,
                    failed: failedCount,
                    branchId,
                }, user.ip);
            }
        }
        catch (error) {
            console.error('Bulk upload failed:', error);
            throw new Error(`Bulk upload failed: ${error.message}`);
        }
        setTimeout(() => {
            delete bulkUploadProgress[uploadId];
        }, 60000);
        return {
            summary: {
                successful: successfulCount,
                failed: failedCount,
                errors: results.filter(r => r.status === 'error').map(r => r.error)
            },
            uploadId
        };
    }
    async getProductCount(tenantId, branchId) {
        return this.prisma.product.count({
            where: {
                tenantId,
                ...(branchId && { branchId }),
            },
        });
    }
    static getBulkUploadProgress(uploadId) {
        return bulkUploadProgress[uploadId] || null;
    }
    async clearAll(tenantId) {
        const deleted = await this.prisma.product.deleteMany({
            where: { tenantId },
        });
        return { deletedCount: deleted.count };
    }
    async randomizeAllStocks(tenantId) {
        const products = await this.prisma.product.findMany({
            where: { tenantId },
        });
        for (const product of products) {
            const randomStock = Math.floor(Math.random() * 191) + 10;
            await this.prisma.product.update({
                where: { id: product.id },
                data: { stock: randomStock },
            });
        }
        return { updated: products.length };
    }
    async generateQrCode(id, tenantId, res) {
        const product = await this.prisma.product.findFirst({
            where: { id, tenantId },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        const qrCodeDataUrl = await qrcode.toDataURL(product.id);
        res.setHeader('Content-Type', 'image/png');
        const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
        const img = Buffer.from(base64Data, 'base64');
        res.send(img);
    }
    async uploadProductImages(productId, files, tenantId, userId) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, tenantId },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        const uploadsDir = path.join(process.cwd(), 'uploads', 'products', tenantId);
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const imageUrls = [];
        for (const file of files) {
            if (!file.mimetype.startsWith('image/')) {
                throw new common_1.BadRequestException('Only image files are allowed');
            }
            if (file.size > 5 * 1024 * 1024) {
                throw new common_1.BadRequestException('Image size must be less than 5MB');
            }
            const fileExtension = path.extname(file.originalname) || '.jpg';
            const fileName = `${productId}_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;
            const filePath = path.join(uploadsDir, fileName);
            try {
                const optimizedBuffer = await (0, sharp_1.default)(file.buffer)
                    .resize(1200, 1200, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                    .jpeg({ quality: 85, progressive: true })
                    .toBuffer();
                fs.writeFileSync(filePath, optimizedBuffer);
                const imageUrl = `/uploads/products/${tenantId}/${fileName}`;
                imageUrls.push(imageUrl);
            }
            catch (error) {
                console.error('Error processing image:', error);
                throw new common_1.BadRequestException('Failed to process image');
            }
        }
        const updatedProduct = await this.prisma.product.update({
            where: { id: productId },
            data: {
                images: {
                    push: imageUrls,
                },
            },
        });
        if (this.auditLogService) {
            await this.auditLogService.log(userId, 'product_images_uploaded', { productId, imageCount: imageUrls.length }, undefined);
        }
        return updatedProduct;
    }
    async deleteProductImage(productId, imageUrl, tenantId, userId) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, tenantId },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        const updatedImages = product.images.filter(img => img !== imageUrl);
        try {
            const fileName = path.basename(imageUrl);
            const filePath = path.join(process.cwd(), 'uploads', 'products', tenantId, fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        catch (error) {
            console.error('Error deleting image file:', error);
        }
        const updatedProduct = await this.prisma.product.update({
            where: { id: productId },
            data: { images: updatedImages },
        });
        if (this.auditLogService) {
            await this.auditLogService.log(userId, 'product_image_deleted', { productId, imageUrl }, undefined);
        }
        return updatedProduct;
    }
    getImageUrl(imagePath) {
        if (imagePath.startsWith('http')) {
            return imagePath;
        }
        if (imagePath.startsWith('/uploads')) {
            return imagePath;
        }
        return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}${imagePath}`;
    }
    async findOne(id, tenantId) {
        return this.prisma.product.findFirst({
            where: { id, tenantId },
            include: {
                supplier: true,
                category: true,
                variations: {
                    include: {
                        branch: true,
                    },
                },
                branch: true,
                tenant: true,
            },
        });
    }
    async createCategory(data) {
        return this.prisma.productCategory.create({
            data: {
                ...data,
                id: (0, uuid_1.v4)(),
            },
        });
    }
    async getCategories(tenantId) {
        return this.prisma.productCategory.findMany({
            where: { tenantId, isActive: true },
            include: {
                attributes: {
                    where: { isActive: true },
                },
                _count: {
                    select: { products: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async updateCategory(id, data, tenantId) {
        return this.prisma.productCategory.updateMany({
            where: { id, tenantId },
            data,
        });
    }
    async deleteCategory(id, tenantId) {
        const productCount = await this.prisma.product.count({
            where: { categoryId: id, tenantId },
        });
        if (productCount > 0) {
            throw new common_1.BadRequestException('Cannot delete category with existing products');
        }
        return this.prisma.productCategory.updateMany({
            where: { id, tenantId },
            data: { isActive: false },
        });
    }
    async createAttribute(data) {
        return this.prisma.productAttribute.create({
            data: {
                ...data,
                id: (0, uuid_1.v4)(),
            },
        });
    }
    async getAttributesByCategory(categoryId, tenantId) {
        return this.prisma.productAttribute.findMany({
            where: { categoryId, tenantId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async updateAttribute(id, data, tenantId) {
        return this.prisma.productAttribute.updateMany({
            where: { id, tenantId },
            data,
        });
    }
    async deleteAttribute(id, tenantId) {
        return this.prisma.productAttribute.updateMany({
            where: { id, tenantId },
            data: { isActive: false },
        });
    }
    async createVariation(data) {
        return this.prisma.productVariation.create({
            data: {
                ...data,
                id: (0, uuid_1.v4)(),
            },
        });
    }
    async getVariationsByProduct(productId, tenantId) {
        return this.prisma.productVariation.findMany({
            where: { productId, tenantId, isActive: true },
            orderBy: { createdAt: 'asc' },
        });
    }
    async updateVariation(id, data, tenantId) {
        return this.prisma.productVariation.updateMany({
            where: { id, tenantId },
            data,
        });
    }
    async deleteVariation(id, tenantId) {
        return this.prisma.productVariation.updateMany({
            where: { id, tenantId },
            data: { isActive: false },
        });
    }
    generateVariationsFromAttributes(attributes, baseProduct) {
        if (!attributes || attributes.length === 0)
            return [];
        const combinations = this.cartesianProduct(attributes.map(attr => attr.values));
        return combinations.map((combination, index) => {
            const attrsObj = {};
            attributes.forEach((attr, attrIndex) => {
                attrsObj[attr.name] = combination[attrIndex];
            });
            return {
                sku: `${baseProduct.sku}-${index + 1}`,
                price: baseProduct.price,
                cost: baseProduct.cost,
                stock: 0,
                attributes: attrsObj,
                tenantId: baseProduct.tenantId,
                branchId: baseProduct.branchId,
            };
        });
    }
    cartesianProduct(arrays) {
        if (arrays.length === 0)
            return [[]];
        const [first, ...rest] = arrays;
        const restCombinations = this.cartesianProduct(rest);
        return first.flatMap(value => restCombinations.map(combination => [value, ...combination]));
    }
    async generateVariationsFromCustomFields(productId, tenantId, userId) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, tenantId },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (!product.customFields || typeof product.customFields !== 'object') {
            throw new common_1.BadRequestException('Product has no custom fields to generate variations from');
        }
        const attributes = [];
        const customFields = product.customFields;
        for (const [key, value] of Object.entries(customFields)) {
            if (Array.isArray(value) && value.length > 0) {
                attributes.push({
                    name: key,
                    values: value,
                });
            }
        }
        if (attributes.length === 0) {
            throw new common_1.BadRequestException('No array-type custom fields found to generate variations');
        }
        const variations = this.generateVariationsFromAttributes(attributes, product);
        await this.prisma.productVariation.deleteMany({
            where: { productId, tenantId },
        });
        const createdVariations = await this.prisma.productVariation.createMany({
            data: variations.map(variation => ({
                ...variation,
                productId,
                tenantId,
                branchId: product.branchId,
            })),
        });
        await this.prisma.product.update({
            where: { id: productId },
            data: { hasVariations: true },
        });
        if (this.auditLogService) {
            await this.auditLogService.log(userId, 'product_variations_generated', { productId, variationCount: variations.length, attributes: attributes.map(a => a.name) }, undefined);
        }
        return {
            message: `Generated ${variations.length} variations from custom fields`,
            variations: variations.length,
            attributes: attributes.map(a => ({ name: a.name, values: a.values })),
        };
    }
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService,
        billing_service_1.BillingService,
        subscription_service_1.SubscriptionService])
], ProductService);
//# sourceMappingURL=product.service.js.map