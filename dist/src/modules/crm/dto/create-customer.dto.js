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
exports.CreateCustomerDto = exports.CustomerGroup = exports.CustomerSource = exports.Gender = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
    Gender["OTHER"] = "OTHER";
    Gender["PREFER_NOT_TO_SAY"] = "PREFER_NOT_TO_SAY";
})(Gender || (exports.Gender = Gender = {}));
var CustomerSource;
(function (CustomerSource) {
    CustomerSource["WALK_IN"] = "WALK_IN";
    CustomerSource["REFERRAL"] = "REFERRAL";
    CustomerSource["SOCIAL_MEDIA"] = "SOCIAL_MEDIA";
    CustomerSource["WEBSITE"] = "WEBSITE";
    CustomerSource["OTHER"] = "OTHER";
})(CustomerSource || (exports.CustomerSource = CustomerSource = {}));
var CustomerGroup;
(function (CustomerGroup) {
    CustomerGroup["RETAIL"] = "RETAIL";
    CustomerGroup["WHOLESALE"] = "WHOLESALE";
    CustomerGroup["CORPORATE"] = "CORPORATE";
    CustomerGroup["VIP"] = "VIP";
})(CustomerGroup || (exports.CustomerGroup = CustomerGroup = {}));
class CreateCustomerDto {
    firstName;
    lastName;
    email;
    phone;
    gender;
    dateOfBirth;
    address;
    city;
    postalCode;
    country;
    source;
    group;
    taxId;
    notes;
    emailMarketingOptIn;
    smsMarketingOptIn;
}
exports.CreateCustomerDto = CreateCustomerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Customer first name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Customer last name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Customer email address', required: false }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Customer phone number (without country code)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: Gender, required: false }),
    (0, class_validator_1.IsEnum)(Gender),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date of birth (YYYY-MM-DD)', required: false }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], CreateCustomerDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Street address', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'City', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Postal/ZIP code', required: false }),
    (0, class_validator_1.IsPostalCode)('any'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Country', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: CustomerSource, required: false }),
    (0, class_validator_1.IsEnum)(CustomerSource),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: CustomerGroup, required: false }),
    (0, class_validator_1.IsEnum)(CustomerGroup),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "group", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tax ID or VAT number', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "taxId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Additional notes', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Opt-in for email marketing', default: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateCustomerDto.prototype, "emailMarketingOptIn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Opt-in for SMS marketing', default: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateCustomerDto.prototype, "smsMarketingOptIn", void 0);
//# sourceMappingURL=create-customer.dto.js.map