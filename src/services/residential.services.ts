import { Prisma, PropertySpecificationType } from "@prisma/client";
import { prismaClient } from "..";
import { PropertyType } from "@prisma/client"
import { AdditionalRule, Booking, ICommercialDTO, IResidentialDTO, SeasonalPricing, IShortletDTO, UnavailableDate, ICreateProperty, IPropertySpecificationDTO, IBasePropertyDTO } from "../validations/interfaces/properties.interface";



type PropertyWithSpecification = Prisma.propertiesGetPayload<{
    include: any;
}>;

type FlattenedProperty = Record<string, any>;

interface PropertyFilters {
    landlordId?: string;
    property?: {
        state?: string;
        country?: string;
        isActive?: boolean;
        specificationType?: string;
        propertysize?: number;
        marketValue?: number;
        maxRentalFee?: number;
        minRentalFee?: number;
        rentalFee?: number;
        maxBedRoom?: number;
        minBedRoom?: number;
        // noBathRoom?: number;
        maxBathRoom?: number;
        minBathRoom?: number;
        noKitchen?: number;
        minGarage?: number;
        maxGarage?: number;
        type?: PropertyType | PropertyType[];
    };
    isShortlet?: boolean,
    dueDate?: Date,
    yearBuilt?: Date,
    zipcode?: string,
    amenities?: [string],
    minSize?: number;
    maxSize?: number;
    mustHaves?: string[];
}

class ResidentialPropertyService {




    constructor() {

    }


    getResidentialPropertyById = async (propertyId: string) =>{
        return await prismaClient.residentialProperty.findUnique({
            where:{id: propertyId},
            include:{
                unitConfigurations: true,
                sharedFacilities: true,
                bills: true,
            }
        })
    }



}

export default new ResidentialPropertyService()