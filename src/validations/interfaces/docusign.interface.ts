export interface CreateDocuTemplateDto {
  title: string;
  description?: string;
  ownerId?: string;
  content: string;
  isActive?: boolean;
  
}

// For updating template metadata
export interface UpdateDocuTemplateDto {
  title?: string;
  description?: string;
  isActive?: boolean;
}

// For creating a new version
export interface CreateVersionDto {
  content: string;
}

// For assigning templates to users
export interface AssignDocuTemplateDto {
  userId: string;
  templateId: string;
  isDefault?: boolean;
}

// For template responses
export interface DocuTemplateResponseDto {
  id: string;
  title: string;
  description?: string;
  content: string;
  ownerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  versions?: TemplateVersionDto[];
}

// For template version responses
export interface TemplateVersionDto {
  id: string;
  version: number;
  content: object;
  createdAt: Date;
  updatedBy: string;
}

// For user-template assignment responses
export interface UserTemplateAssignmentDto {
  id: string;
  userId: string;
  templateId: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// For template with owner information
export interface TemplateWithOwnerDto {
  id: string;
  title: string;
  description?: string;
  owner: {
    id: string;
    email: string;
  };
  latestVersion?: TemplateVersionDto;
}