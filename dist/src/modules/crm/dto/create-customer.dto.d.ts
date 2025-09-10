export declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER",
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"
}
export declare enum CustomerSource {
    WALK_IN = "WALK_IN",
    REFERRAL = "REFERRAL",
    SOCIAL_MEDIA = "SOCIAL_MEDIA",
    WEBSITE = "WEBSITE",
    OTHER = "OTHER"
}
export declare enum CustomerGroup {
    RETAIL = "RETAIL",
    WHOLESALE = "WHOLESALE",
    CORPORATE = "CORPORATE",
    VIP = "VIP"
}
export declare class CreateCustomerDto {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    gender?: Gender;
    dateOfBirth?: Date;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    source?: CustomerSource;
    group?: CustomerGroup;
    taxId?: string;
    notes?: string;
    emailMarketingOptIn?: boolean;
    smsMarketingOptIn?: boolean;
}
