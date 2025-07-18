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
const bulkUploadProgress = {};
function findColumnMatch(headers, candidates) {
    for (const candidate of candidates) {
        const exact = headers.find(h => h.toLowerCase() === candidate.toLowerCase());
        if (exact)
            return exact;
        const partial = headers.find(h => h.toLowerCase().includes(candidate.toLowerCase()));
        if (partial)
            return partial;
    }
    return undefined;
}
let ProductService = class ProductService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllByTenant(tenantId) {
        return this.prisma.product.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createProduct(data) {
        return this.prisma.product.create({ data });
    }
    async updateProduct(id, data, tenantId) {
        const { name, sku, price, description, stock, ...customFields } = data;
        const updateData = {};
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
        if (Object.keys(customFields).length > 0) {
            updateData.customFields = customFields;
        }
        return this.prisma.product.updateMany({
            where: { id, tenantId },
            data: updateData,
        });
    }
    async deleteProduct(id, tenantId) {
        return this.prisma.product.deleteMany({
            where: { id, tenantId },
        });
    }
    async bulkUpload(file, user, uploadId) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (rows.length === 0) {
            return { summary: [{ status: 'error', error: 'No data found in file.' }] };
        }
        if (!uploadId)
            uploadId = (0, uuid_1.v4)();
        bulkUploadProgress[uploadId] = { processed: 0, total: rows.length };
        const headers = Object.keys(rows[0]);
        const nameCandidates = ['name', 'product name', 'item name', 'description', 'title'];
        const skuCandidates = ['sku', 'product id', 'product code', 'partnumber', 'part number', 'code', 'id'];
        const priceCandidates = ['price', 'unit price', 'cost', 'price usd', 'amount'];
        const nameCol = findColumnMatch(headers, nameCandidates);
        const skuCol = findColumnMatch(headers, skuCandidates);
        const priceCol = findColumnMatch(headers, priceCandidates);
        const requiredFields = ['name', 'sku', 'price'];
        const results = [];
        for (const [i, row] of rows.entries()) {
            try {
                const mappedRow = { ...row };
                if (nameCol)
                    mappedRow.name = row[nameCol];
                if (skuCol)
                    mappedRow.sku = row[skuCol];
                if (priceCol)
                    mappedRow.price = row[priceCol];
                for (const field of requiredFields) {
                    if (!mappedRow[field])
                        throw new Error(`Missing required field: ${field}`);
                }
                const { name, sku, price, description, stock, ...customFields } = mappedRow;
                const productData = {
                    name,
                    sku: sku !== undefined ? String(sku) : '',
                    price: parseFloat(price),
                    description: description || '',
                    stock: stock !== undefined ? parseInt(stock) : 0,
                    tenantId: user.tenantId,
                };
                if (Object.keys(customFields).length > 0) {
                    productData.customFields = customFields;
                }
                await this.prisma.product.create({ data: productData });
                results.push({ row: mappedRow, status: 'success' });
            }
            catch (error) {
                results.push({ row, status: 'error', error: error.message });
            }
            bulkUploadProgress[uploadId].processed = i + 1;
        }
        setTimeout(() => { delete bulkUploadProgress[uploadId]; }, 60000);
        return { summary: results, uploadId };
    }
    static getBulkUploadProgress(uploadId) {
        return bulkUploadProgress[uploadId] || null;
    }
    async clearAll(tenantId) {
        const deleted = await this.prisma.product.deleteMany({ where: { tenantId } });
        return { deletedCount: deleted.count };
    }
    async randomizeAllStocks(tenantId) {
        const products = await this.prisma.product.findMany({ where: { tenantId } });
        for (const product of products) {
            const randomStock = Math.floor(Math.random() * 191) + 10;
            await this.prisma.product.update({
                where: { id: product.id },
                data: { stock: randomStock },
            });
        }
        return { updated: products.length };
    }
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductService);
//# sourceMappingURL=product.service.js.map