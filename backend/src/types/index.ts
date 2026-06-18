// User Roles Enum
export enum UserRole {
    SYSTEM_OWNER = 'system_owner',
    ADMIN = 'admin',
    ORGANIZATION = 'organization',
    CSA = 'csa',
    USER = 'user'
}

// Organization Interface
export interface IOrganization {
    id?: string;
    _id?: string;
    name: string;
    description?: string;
    logo?: string;
    ownerId?: string;
    is_active: boolean;
    is_deleted: boolean;
    deleted_at?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

// Permission Interface
export interface IPermission {
    id?: string;
    _id?: string;
    name: string;
    slug: string;
    description?: string;
    module: string;
    is_deleted: boolean;
    deleted_at?: Date | null;
    created_at: Date;
    updated_at: Date;
}

// Role Interface
export interface IRole {
    id?: string;
    _id?: string;
    name: string;
    slug: string;
    description?: string;
    permissions: string[];
    scopeType: 'global' | 'organization';
    isSystemRole: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IRoleAssignment {
    id?: string;
    _id?: string;
    userId: string;
    roleId: string | IRole;
    scope: {
        type: 'global' | 'organization';
        organizationId?: string | null;
    };
    expiresAt?: Date;
    assignedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

// User Interface
export interface IUser {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    password: string;
    status: 'active' | 'disabled';
    organization?: string;
    lead_access_enabled: boolean;
    is_active: boolean;
    is_deleted: boolean;
    deleted_at?: Date | null;
    plan: 'free' | 'paid' | 'enterprise';
    tokens: number;
    referral_count: number;
    points: number;
    createdAt: Date;
    updatedAt: Date;
    comparePassword?(password: string): Promise<boolean>;
    save?(): Promise<this>;
}

// Keyword Interface
export interface IKeyword {
    id?: string;
    _id?: string;
    text: string;
    platforms: string[];
    is_active: boolean;
    is_deleted: boolean;
    deleted_at?: Date | null;
    created_at: Date;
    updated_at: Date;
}

// Apify Key Interface
export interface IApifyKey {
    id?: string;
    _id?: string;
    key: string;
    label?: string;
    is_active: boolean;
    is_deleted: boolean;
    deleted_at?: Date | null;
    created_at: Date;
    updated_at: Date;
}

// Lead Post Interface
export interface ILeadPost {
    id?: string;
    _id?: string;
    post_id: string;
    url: string;
    content: string;
    platform: 'linkedin' | 'twitter' | 'reddit' | 'threads' | 'manual';
    author: {
        id: string;
        name: string;
        handle?: string;
        url?: string;
        info?: string;
        avatar?: {
            url: string;
            width?: number;
            height?: number;
        };
        followers?: number;
        following?: number;
        is_blue_verified?: boolean;
    };
    posted_at: {
        timestamp?: number;
        date: Date;
        posted_ago_short?: string;
        posted_ago_text?: string;
    };
    engagement: {
        likes: number;
        comments: number;
        shares: number;
        views?: number | string;
    };
    keyword: string;
    keyword_id?: string;
    status: 'pending' | 'relevant' | 'irrelevant';
    source: 'scraped' | 'manual';
    image_url?: string | null;
    ai_score: number;
    is_training_data: boolean;
    is_deleted: boolean;
    deleted_at?: Date | null;
    email?: string;
    contact_info?: {
        name?: string;
        first_name?: string;
        last_name?: string;
        title?: string;
        headline?: string;
        city?: string;
        country?: string;
        state?: string;
        company_name?: string;
        phone_numbers?: Array<{ number: string; type: string }>;
        linkedin_public_id?: string;
        email_status?: string;
        email_source?: 'post_text' | 'apify_profile' | 'contact_compass' | 'hunter_finder' | 'compass_and_hunter' | 'pattern_guess' | 'threads_profile';
        company_domain?: string;
        credits_left?: number;
    };
    raw_result?: any;
    source_type?: 'keyword' | 'profile_activity';
    source_profile?: string;
    qualification_reason?: string;
    enrichment_status?: 'pending' | 'searching' | 'found' | 'partial' | 'not_found' | 'skipped' | 'failed' | null;
    enrichment_message?: string | null;
    enriched_at?: Date | null;
    intelligence?: string;
    claimed_count: number;
    createdAt: Date;
    updatedAt: Date;
}

// Generic API Response
export interface IApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    count?: number;
    error?: string;
}

// Cron Log Interface
export interface ICronLog {
    id?: string;
    _id?: string;
    job_name: string;
    start_time: Date;
    end_time?: Date;
    status: 'running' | 'completed' | 'failed';
    items_scraped: number;
    total_processed: number;
    new_leads: number;
    duplicate_count: number;
    error?: string;
    details?: string;
    is_deleted: boolean;
    deleted_at?: Date | null;
    created_at: Date;
    updated_at: Date;
}

// Scraped Post Record
export interface IScrapedPost {
    id?: string;
    _id?: string;
    log_id: string;
    post: string | ILeadPost;
    is_duplicate: boolean;
    scraped_at: Date;
    is_deleted: boolean;
    deleted_at?: Date | null;
    created_at: Date;
    updated_at: Date;
}

// Setting Interface
export interface ISetting {
    id?: string;
    _id?: string;
    key: string;
    value: any;
    description?: string;
    is_deleted: boolean;
    deleted_at?: Date | null;
    created_at: Date;
    updated_at: Date;
}

// Claim Interface
export interface IClaim {
    id?: string;
    _id?: string;
    userId: string;
    leadId: string | ILeadPost;
    token_cost: number;
    status: 'new' | 'contacted' | 'replied' | 'converted' | 'rejected' | 'archived';
    notes: string;
    last_contacted?: Date | null;
    timestamp: Date;
}
