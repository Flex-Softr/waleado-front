export type IntegrationCategory =
  | "All"
  | "Billing & Hosting"
  | "eCommerce & CMS"
  | "CRM & Support"
  | "Marketing & Automation";

export type IntegrationStatus = "available" | "coming_soon" | "beta";

export interface IntegrationFeature {
  title: string;
  description: string;
  badge?: string;
}

export interface IntegrationGuideStep {
  stepNumber: number;
  title: string;
  description: string;
  codeSnippet?: string;
  codeLanguage?: string;
  note?: string;
}

export interface MergeTagItem {
  tag: string;
  description: string;
  example: string;
  category?: string;
}

export interface IntegrationFaqItem {
  question: string;
  answer: string;
}

export interface ArchitectureDetail {
  protocol: string;
  authMethod: string;
  endpoints: string[];
  supportedHooks: string[];
}

export interface IntegrationItem {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  shortDescription: string;
  fullDescription: string;
  category: "Billing & Hosting" | "eCommerce & CMS" | "CRM & Support" | "Marketing & Automation";
  version: string;
  status: IntegrationStatus;
  badges: string[];
  rating: number;
  reviewsCount: number;
  lastUpdated: string;
  author: {
    name: string;
    url?: string;
    verified: boolean;
  };
  iconType: "whmcs" | "wordpress" | "api";
  downloadUrl?: string;
  downloadFilename?: string;
  downloadSize?: string;
  compatibility: {
    phpVersion?: string;
    platformVersion?: string;
    requiresApiCredentials: boolean;
    requiresActiveDevice: boolean;
    testedWith?: string[];
  };
  tags: string[];
  keyFeatures: IntegrationFeature[];
  guide: {
    summary: string;
    prerequisites: string[];
    steps: IntegrationGuideStep[];
  };
  mergeTags?: MergeTagItem[];
  architecture: ArchitectureDetail;
  faqs: IntegrationFaqItem[];
}
