import { Prisma } from "@prisma/client";

/**
 * Normalized Tenant Interface
 * This is the consistent structure all tenant endpoints should return
 */
export interface NormalizedTenant {
    // Core Tenant Info
    id: string;
    tenantId: string | null;
    tenantCode: string;
    landlordId: string;
    propertyId: string;
    userId: string;
    applicationId: string | null;
    roomId: string | null;
    unitId: string | null;
    
    // Lease Information
    leaseStartDate: string | Date | null;
    leaseEndDate: string | Date | null;
    isCurrentLease: boolean;
    dateOfFirstRent: string | Date | null;
    initialDeposit: string;
    
    // Contact & Account
    tenantWebUserEmail: string;
    stripeCustomerId: string | null;
    apartmentOrFlatNumber: string | number | null;
    rentstatus: number | null;
    
    // Timestamps
    createdAt: string | Date;
    updatedAt: string | Date;
    
    // Personal Information (normalized)
    personalInfo: {
        id: string | null;
        title: string | null;
        firstName: string | null;
        middleName: string | null;
        lastName: string | null;
        fullName: string; // Computed
        email: string | null;
        phoneNumber: string | null;
        dob: string | Date | null;
        maritalStatus: string | null;
        nationality: string | null;
        identificationType: string | null;
        identificationNo: string | null;
        issuingAuthority: string | null;
        expiryDate: string | Date | null;
        nextOfKin: {
            id: string | null;
            firstName: string | null;
            middleName: string | null;
            lastName: string | null;
            fullName: string; // Computed
            email: string | null;
            phoneNumber: string | null;
            relationship: string | null;
        } | null;
    } | null;
    
    // Employment Information
    employmentInfo: {
        id: string | null;
        employmentStatus: string | null;
        positionTitle: string | null;
        employerCompany: string | null;
        employerEmail: string | null;
        employerPhone: string | null;
        monthlyOrAnualIncome: string | null;
        startDate: string | Date | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        zipCode: string | null;
    } | null;
    
    // Guarantor Information
    guarantorInfo: {
        id: string | null;
        fullName: string | null;
        email: string | null;
        phoneNumber: string | null;
        address: string | null;
        relationship: string | null;
        employerName: string | null;
        monthlyIncome: string | null;
    } | null;
    
    // Residential Information
    residentialInfo: {
        id: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        zipCode: string | null;
        addressStatus: string | null;
        lengthOfResidence: string | null;
        reasonForLeaving: string | null;
        landlordOrAgencyName: string | null;
        landlordOrAgencyEmail: string | null;
        landlordOrAgencyPhoneNumber: string | null;
    } | null;
    
    // Application Information
    applicationQuestions: Array<{
        id: string;
        havePet: string | null;
        youSmoke: string | null;
        requireParking: string | null;
        haveOutstandingDebts: string | null;
        additionalOccupants: string | null;
        additionalInformation: string | null;
    }> | null;
    
    declarationInfo: Array<{
        id: string;
        date: string | Date;
        signature: string | null;
        declaration: string | null;
        additionalNotes: string | null;
    }> | null;
    
    // Property Information (normalized - can use ListingNormalizer for property if needed)
    property: {
        id: string;
        name: string;
        description: string | null;
        address: string;
        city: string;
        state: {
            id: string;
            name: string;
        } | null;
        country: string;
        zipcode: string;
        price: string; // Converted from Decimal
        rentalFee: string | null; // Converted from Decimal
        currency: string | null;
        priceFrequency: string | null;
        availability: string | null;
        specificationType: string | null;
    } | null;
    
    // User Information (normalized)
    user: {
        id: string;
        email: string;
        isVerified: boolean;
        profile: {
            id: string | null;
            fullname: string | null;
            firstName: string | null;
            lastName: string | null;
            middleName: string | null;
            profileUrl: string | null;
            phoneNumber: string | null;
            dateOfBirth: string | Date | null;
            gender: string | null;
        } | null;
    } | null;
    
    // Additional fields (preserved but normalized)
    emergencyContactInfo: any | null;
    refereeInfo: any | null;
    applicationMetadata: any | null;
    agreementInfo: any | null;
    
    // NEW: Rent amount and entity context (computed for performance)
    rentAmount: string; // Computed correct price (room.price || unit.price || property.rentalFee || property.price)
    entityType: 'room' | 'unit' | 'property'; // What entity the tenant is in
    entityDetails: {
        type: 'room' | 'unit' | 'property';
        id: string | null;
        name: string; // roomName, unitName, or property name
        price: string;
        priceFrequency: string | null;
    } | null;
}

/**
 * Tenant Normalizer Class
 * Transforms raw tenant data from database into consistent normalized structure
 */
export class TenantNormalizer {
    /**
     * Normalize a single tenant
     * @param tenant - The raw tenant object from database
     */
    static normalize(tenant: any): NormalizedTenant {
        // Normalize personal info
        const personalInfo = this.extractPersonalInfo(tenant);
        
        // Normalize employment info
        const employmentInfo = this.extractEmploymentInfo(tenant);
        
        // Normalize guarantor info
        const guarantorInfo = this.extractGuarantorInfo(tenant);
        
        // Normalize residential info
        const residentialInfo = this.extractResidentialInfo(tenant);
        
        // Normalize property
        const property = this.extractProperty(tenant);
        
        // Normalize user
        const user = this.extractUser(tenant);
        
        // Normalize application questions
        const applicationQuestions = this.extractApplicationQuestions(tenant);
        
        // Normalize declaration info
        const declarationInfo = this.extractDeclarationInfo(tenant);
        
        // Compute entity type and rent amount (efficient single pass)
        const { entityType, entityDetails, rentAmount } = this.extractEntityAndRent(tenant);
        
        return {
            id: tenant.id,
            tenantId: tenant.tenantId || null,
            tenantCode: tenant.tenantCode || '',
            landlordId: tenant.landlordId || '',
            propertyId: tenant.propertyId || '',
            userId: tenant.userId || '',
            applicationId: tenant.applicationId || null,
            roomId: tenant.roomId || null,
            unitId: tenant.unitId || null,
            leaseStartDate: tenant.leaseStartDate || null,
            leaseEndDate: tenant.leaseEndDate || null,
            isCurrentLease: tenant.isCurrentLease ?? false,
            dateOfFirstRent: tenant.dateOfFirstRent || null,
            initialDeposit: this.convertDecimalToString(tenant.initialDeposit) || '0',
            tenantWebUserEmail: tenant.tenantWebUserEmail || '',
            stripeCustomerId: tenant.stripeCustomerId || null,
            apartmentOrFlatNumber: tenant.apartmentOrFlatNumber || null,
            rentstatus: tenant.rentstatus || null,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt,
            personalInfo,
            employmentInfo,
            guarantorInfo,
            residentialInfo,
            applicationQuestions,
            declarationInfo,
            property,
            user,
            emergencyContactInfo: tenant.emergencyContactInfo || null,
            refereeInfo: tenant.refereeInfo || null,
            applicationMetadata: tenant.applicationMetadata || null,
            agreementInfo: tenant.agreementInfo || null,
            // NEW: Computed fields for easy access
            rentAmount,
            entityType,
            entityDetails,
        };
    }
    
    /**
     * Normalize multiple tenants
     */
    static normalizeMany(tenants: any[]): NormalizedTenant[] {
        return tenants.map(tenant => this.normalize(tenant));
    }
    
    /**
     * Extract and normalize personal information
     * Handles both JSON field (tenant.personalInfo) and application relation (tenant.application.personalDetails)
     */
    private static extractPersonalInfo(tenant: any): NormalizedTenant['personalInfo'] {
        // Try JSON field first, then application relation
        let personalInfo = null;
        if (tenant.personalInfo && typeof tenant.personalInfo === 'object') {
            // JSON field - already parsed by Prisma
            personalInfo = tenant.personalInfo;
        } else if (tenant.application?.personalDetails) {
            // Application relation
            personalInfo = tenant.application.personalDetails;
        }
        
        if (!personalInfo) return null;
        
        // Handle both JSON object and Prisma model
        const firstName = personalInfo.firstName || '';
        const middleName = personalInfo.middleName || '';
        const lastName = personalInfo.lastName || '';
        const fullName = `${firstName} ${middleName} ${lastName}`.trim() || personalInfo.email || 'Unknown';
        
        // Extract nextOfKin - could be nested in personalInfo or separate
        const nextOfKin = personalInfo.nextOfKin || personalInfo.nextOfKinInfo || tenant.nextOfKinInfo || null;
        const nextOfKinFullName = nextOfKin 
            ? `${nextOfKin.firstName || ''} ${nextOfKin.middleName || ''} ${nextOfKin.lastName || ''}`.trim() || 'Unknown'
            : 'Unknown';
        
        return {
            id: personalInfo.id || null,
            title: personalInfo.title || null,
            firstName: firstName || null,
            middleName: middleName || null,
            lastName: lastName || null,
            fullName,
            email: personalInfo.email || null,
            phoneNumber: personalInfo.phoneNumber || null,
            dob: personalInfo.dob || null,
            maritalStatus: personalInfo.maritalStatus || null,
            nationality: personalInfo.nationality || null,
            identificationType: personalInfo.identificationType || null,
            identificationNo: personalInfo.identificationNo || null,
            issuingAuthority: personalInfo.issuingAuthority || null,
            expiryDate: personalInfo.expiryDate || null,
            nextOfKin: nextOfKin ? {
                id: nextOfKin.id || null,
                firstName: nextOfKin.firstName || null,
                middleName: nextOfKin.middleName || null,
                lastName: nextOfKin.lastName || null,
                fullName: nextOfKinFullName,
                email: nextOfKin.email || null,
                phoneNumber: nextOfKin.phoneNumber || null,
                relationship: nextOfKin.relationship || null,
            } : null,
        };
    }
    
    /**
     * Extract and normalize employment information
     * Handles both JSON field and application relation
     */
    private static extractEmploymentInfo(tenant: any): NormalizedTenant['employmentInfo'] {
        let employmentInfo = null;
        if (tenant.employmentInfo && typeof tenant.employmentInfo === 'object') {
            employmentInfo = tenant.employmentInfo;
        } else if (tenant.application?.employmentInfo) {
            employmentInfo = tenant.application.employmentInfo;
        }
        if (!employmentInfo) return null;
        
        return {
            id: employmentInfo.id || null,
            employmentStatus: employmentInfo.employmentStatus || null,
            positionTitle: employmentInfo.positionTitle || null,
            employerCompany: employmentInfo.employerCompany || null,
            employerEmail: employmentInfo.employerEmail || null,
            employerPhone: employmentInfo.employerPhone || null,
            monthlyOrAnualIncome: employmentInfo.monthlyOrAnualIncome || null,
            startDate: employmentInfo.startDate || null,
            address: employmentInfo.address || null,
            city: employmentInfo.city || null,
            state: employmentInfo.state || null,
            country: employmentInfo.country || null,
            zipCode: employmentInfo.zipCode || null,
        };
    }
    
    /**
     * Extract and normalize guarantor information
     * Handles both JSON field and application relation
     */
    private static extractGuarantorInfo(tenant: any): NormalizedTenant['guarantorInfo'] {
        let guarantorInfo = null;
        if (tenant.guarantorInfo && typeof tenant.guarantorInfo === 'object') {
            guarantorInfo = tenant.guarantorInfo;
        } else if (tenant.application?.guarantorInformation) {
            guarantorInfo = tenant.application.guarantorInformation;
        }
        if (!guarantorInfo) return null;
        
        return {
            id: guarantorInfo.id || null,
            fullName: guarantorInfo.fullName || null,
            email: guarantorInfo.email || null,
            phoneNumber: guarantorInfo.phoneNumber || null,
            address: guarantorInfo.address || null,
            relationship: guarantorInfo.relationship || null,
            employerName: guarantorInfo.employerName || null,
            monthlyIncome: guarantorInfo.monthlyIncome || null,
        };
    }
    
    /**
     * Extract and normalize residential information
     * Handles both JSON field and application relation
     */
    private static extractResidentialInfo(tenant: any): NormalizedTenant['residentialInfo'] {
        let residentialInfo = null;
        if (tenant.residentialInfo && typeof tenant.residentialInfo === 'object') {
            residentialInfo = tenant.residentialInfo;
        } else if (tenant.application?.residentialInfo) {
            residentialInfo = tenant.application.residentialInfo;
        }
        if (!residentialInfo) return null;
        
        return {
            id: residentialInfo.id || null,
            address: residentialInfo.address || null,
            city: residentialInfo.city || null,
            state: residentialInfo.state || null,
            country: residentialInfo.country || null,
            zipCode: residentialInfo.zipCode || null,
            addressStatus: residentialInfo.addressStatus || null,
            lengthOfResidence: residentialInfo.lengthOfResidence || null,
            reasonForLeaving: residentialInfo.reasonForLeaving || null,
            landlordOrAgencyName: residentialInfo.landlordOrAgencyName || null,
            landlordOrAgencyEmail: residentialInfo.landlordOrAgencyEmail || null,
            landlordOrAgencyPhoneNumber: residentialInfo.landlordOrAgencyPhoneNumber || null,
        };
    }
    
    /**
     * Extract and normalize property information
     */
    private static extractProperty(tenant: any): NormalizedTenant['property'] {
        const property = tenant.property || null;
        if (!property) return null;
        
        return {
            id: property.id,
            name: property.name || '',
            description: property.description || null,
            address: property.address || '',
            city: property.city || '',
            state: property.state ? {
                id: property.state.id || property.stateId || '',
                name: property.state.name || '',
            } : null,
            country: property.country || '',
            zipcode: property.zipcode || '',
            price: this.convertDecimalToString(property.price) || '0',
            rentalFee: this.convertDecimalToString(property.rentalFee) || null,
            currency: property.currency || null,
            priceFrequency: property.priceFrequency || null,
            availability: property.availability || null,
            specificationType: property.specificationType || null,
        };
    }
    
    /**
     * Extract and normalize user information
     */
    private static extractUser(tenant: any): NormalizedTenant['user'] {
        const user = tenant.user || null;
        if (!user) return null;
        
        return {
            id: user.id,
            email: user.email || '',
            isVerified: user.isVerified ?? false,
            profile: user.profile ? {
                id: user.profile.id || null,
                fullname: user.profile.fullname || null,
                firstName: user.profile.firstName || null,
                lastName: user.profile.lastName || null,
                middleName: user.profile.middleName || null,
                profileUrl: user.profile.profileUrl || null,
                phoneNumber: user.profile.phoneNumber || null,
                dateOfBirth: user.profile.dateOfBirth || null,
                gender: user.profile.gender || null,
            } : null,
        };
    }
    
    /**
     * Extract and normalize application questions
     * Handles both JSON field (array) and application relation
     */
    private static extractApplicationQuestions(tenant: any): NormalizedTenant['applicationQuestions'] {
        let questions = null;
        
        // JSON field could be an array or a single object
        if (tenant.applicationQuestions) {
            if (Array.isArray(tenant.applicationQuestions)) {
                questions = tenant.applicationQuestions;
            } else if (typeof tenant.applicationQuestions === 'object') {
                // Single object, wrap in array
                questions = [tenant.applicationQuestions];
            }
        } else if (tenant.application?.applicationQuestions) {
            questions = Array.isArray(tenant.application.applicationQuestions) 
                ? tenant.application.applicationQuestions 
                : [tenant.application.applicationQuestions];
        }
        
        if (!questions || !Array.isArray(questions)) return null;
        
        return questions.map((q: any) => ({
            id: q.id || `q_${Math.random().toString(36).substr(2, 9)}`,
            havePet: q.havePet || null,
            youSmoke: q.youSmoke || null,
            requireParking: q.requireParking || null,
            haveOutstandingDebts: q.haveOutstandingDebts || null,
            additionalOccupants: q.additionalOccupants || null,
            additionalInformation: q.additionalInformation || null,
        }));
    }
    
    /**
     * Extract and normalize declaration info
     * Handles both JSON field (array) and application relation
     */
    private static extractDeclarationInfo(tenant: any): NormalizedTenant['declarationInfo'] {
        let declarations = null;
        
        // JSON field could be an array or a single object
        if (tenant.declarationInfo) {
            if (Array.isArray(tenant.declarationInfo)) {
                declarations = tenant.declarationInfo;
            } else if (typeof tenant.declarationInfo === 'object') {
                declarations = [tenant.declarationInfo];
            }
        } else if (tenant.application?.declaration) {
            declarations = Array.isArray(tenant.application.declaration)
                ? tenant.application.declaration
                : [tenant.application.declaration];
        }
        
        if (!declarations || !Array.isArray(declarations)) return null;
        
        return declarations.map((d: any) => ({
            id: d.id || `d_${Math.random().toString(36).substr(2, 9)}`,
            date: d.date || d.createdAt || new Date(),
            signature: d.signature || null,
            declaration: d.declaration || null,
            additionalNotes: d.additionalNotes || null,
        }));
    }
    
    /**
     * Extract entity type and compute rent amount efficiently
     * Single pass to determine room/unit/property and get correct price
     */
    private static extractEntityAndRent(tenant: any): {
        entityType: 'room' | 'unit' | 'property';
        entityDetails: NormalizedTenant['entityDetails'];
        rentAmount: string;
    } {
        const property = tenant.property || null;
        const propertyPrice = property ? this.convertDecimalToString(property.price) || '0' : '0';
        const propertyRentalFee = property ? this.convertDecimalToString(property.rentalFee) : null;
        
        // Priority: room > unit > property
        if (tenant.roomId && tenant.room) {
            const room = tenant.room;
            const roomPrice = room.price || '0'; // Room price is already a string in schema
            const roomName = room.roomName || 'Unnamed Room';
            
            return {
                entityType: 'room',
                entityDetails: {
                    type: 'room',
                    id: room.id,
                    name: roomName,
                    price: roomPrice,
                    priceFrequency: room.priceFrequency || null,
                },
                rentAmount: roomPrice,
            };
        }
        
        if (tenant.unitId && tenant.unit) {
            const unit = tenant.unit;
            const unitPrice = unit.price || '0'; // Unit price is already a string in schema
            const unitName = `${unit.unitType || 'Unit'} ${unit.unitNumber || ''}`.trim() || 'Unnamed Unit';
            
            return {
                entityType: 'unit',
                entityDetails: {
                    type: 'unit',
                    id: unit.id,
                    name: unitName,
                    price: unitPrice,
                    priceFrequency: unit.priceFrequency || null,
                },
                rentAmount: unitPrice,
            };
        }
        
        // Property-level tenant
        const propertyName = property?.name || 'Property';
        const finalPrice = propertyRentalFee || propertyPrice;
        
        return {
            entityType: 'property',
            entityDetails: {
                type: 'property',
                id: property?.id || null,
                name: propertyName,
                price: finalPrice,
                priceFrequency: property?.priceFrequency || null,
            },
            rentAmount: finalPrice,
        };
    }
    
    /**
     * Convert Prisma Decimal to string
     */
    private static convertDecimalToString(value: any): string | null {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
        // Prisma Decimal
        if (value.toString) return value.toString();
        return null;
    }
}
