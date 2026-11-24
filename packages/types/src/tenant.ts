export interface TenantProfileResponse {
  tenant: {
    id: string;
    slug: string;
    name: string;
    status: string;
    ownerUserId: string;
    country: string;
    timezone: string;
    locale: string;
    onboardedAt: Date | string | null;
    effectiveEndDate: Date | string | null;
  };
  detail: {
    id: string;
    tenantId: string;
    displayName: string;
    legalName: string | null;
    instituteType: string | null;
    description: string | null;
    websiteUrl: string | null;
    establishedYear: number | null;
    studentSizeBand: string | null;
    attributes: Record<string, unknown>;
  } | null;
  branding: {
    id: string;
    tenantId: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    theme: Record<string, unknown>;
    showPoweredBy: boolean;
  } | null;
}

export interface TenantContact {
  id: string;
  tenantId: string;
  contactType: string;
  fullName: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  isPrimary: boolean;
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
}

export interface TenantAddress {
  id: string;
  tenantId: string;
  addressType: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
}

export interface TenantDomain {
  id: string;
  host: string;
  domainType: string;
  isPrimary: boolean;
  verificationStatus: string;
  verifiedAt: string | null;
  sslStatus: string | null;
}

export interface TenantSetting {
  namespace: string;
  key: string;
  value: unknown;
}

export interface TenantTaxProfile {
  id: string;
  tenantId: string;
  legalEntityType: string | null;
  panNumber: string | null;
  gstRegistered: boolean;
  gstin: string | null;
  documentRef: string | null;
  verificationStatus: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
}

export interface TenantBankAccount {
  id: string;
  accountHolderName: string;
  bankName: string;
  branchName: string | null;
  ifsc: string;
  accountType: string | null;
  accountLast4: string;
  upiId: string | null;
  isPrimary: boolean;
  verificationStatus: string;
}
