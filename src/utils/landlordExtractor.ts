/**
 * Shared Landlord Extractor Utility
 * Ensures consistent landlord data structure across all normalizers
 * Always includes userId and user.id for chat functionality
 */

export interface NormalizedLandlord {
    id: string;
    landlordCode: string;
    userId?: string;
    user: {
        id: string;
        email: string;
        profile: {
            fullname: string;
            firstName: string;
            lastName: string;
            profileUrl: string | null;
        };
    };
}

/**
 * Extract and normalize landlord information
 * Handles both possible data structures:
 * - landlord.userId (direct field)
 * - landlord.user.id (nested in user object)
 * 
 * @param landlord - The raw landlord object from database
 * @returns Normalized landlord object with userId and user.id
 */
export function extractLandlord(landlord: any): NormalizedLandlord {
    if (!landlord) {
        return {
            id: '',
            landlordCode: '',
            userId: undefined,
            user: {
                id: '',
                email: '',
                profile: {
                    fullname: '',
                    firstName: '',
                    lastName: '',
                    profileUrl: null
                }
            }
        };
    }

    const userId = landlord.userId || landlord.user?.id || undefined;
    
    const userIdFromUser = landlord.user?.id || landlord.userId || '';

    return {
        id: landlord.id,
        landlordCode: landlord.landlordCode || '',
        userId,
        user: {
            id: userIdFromUser,
            email: landlord.user?.email || '',
            profile: {
                fullname: landlord.user?.profile?.fullname || '',
                firstName: landlord.user?.profile?.firstName || '',
                lastName: landlord.user?.profile?.lastName || '',
                profileUrl: landlord.user?.profile?.profileUrl || null
            }
        }
    };
}
