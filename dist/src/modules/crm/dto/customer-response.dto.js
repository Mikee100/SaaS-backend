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
exports.CustomerResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class CustomerResponseDto {
    id;
    firstName;
    lastName;
    email;
    phone;
    address;
    city;
    country;
    postalCode;
    dateOfBirth;
    gender;
    notes;
    createdAt;
    updatedAt;
    totalPurchases;
    totalSpent;
    loyaltyPoints;
}
exports.CustomerResponseDto = CustomerResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Unique identifier of the customer' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'First name of the customer' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Last name of the customer' }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email address of the customer', required: false }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Phone number of the customer', required: false }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Physical address of the customer', required: false }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'City of residence', required: false }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Country of residence', default: 'Kenya', required: false }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Postal/ZIP code', required: false }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date of birth', required: false }),
    __metadata("design:type", Date)
], CustomerResponseDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Gender', required: false }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Additional notes about the customer', required: false }),
    __metadata("design:type", String)
], CustomerResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date when the customer was created' }),
    __metadata("design:type", Date)
], CustomerResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date when the customer was last updated' }),
    __metadata("design:type", Date)
], CustomerResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total number of purchases made by the customer', default: 0 }),
    __metadata("design:type", Number)
], CustomerResponseDto.prototype, "totalPurchases", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total amount spent by the customer', default: 0 }),
    __metadata("design:type", Number)
], CustomerResponseDto.prototype, "totalSpent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Loyalty points balance', required: false }),
    __metadata("design:type", Number)
], CustomerResponseDto.prototype, "loyaltyPoints", void 0);
//# sourceMappingURL=customer-response.dto.js.map