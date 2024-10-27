import { prismaClient } from "..";
import { ICreateProperty } from "../validations/interfaces/properties.interface";
import {PropsApartmentStatus} from "@prisma/client";

class PropertyService {
    createProperty = async (propertyData: ICreateProperty) =>{
        return await prismaClient.properties.create({
            data: {
                ...propertyData,
            }
        })
    }

    getProperties = async () => {
        return await prismaClient.properties.findMany({})
    }
    getPropertiesById = async (id: string) => {
        return await prismaClient.properties.findUnique({
            where: { id },
        });
    }

    updateProperty = async (id: string, data: any) => {
        return await prismaClient.properties.update({
            where: { id },
            data
        });
    }
    deleteProperty = async (landlordId: string, id: string) => {
        return await prismaClient.properties.update({
            where: { id, landlordId },
            data: { isDeleted: true }
        });
    }
    updateAvailabiltyStatus = async (landlordId: string, id: string, availability: PropsApartmentStatus) => {
        return await prismaClient.properties.update({
            where: { id, landlordId },
            data: { availability}
        });
    }

    // Function to aggregate properties by state for the current landlord
    aggregatePropertiesByState = async (landlordId: string) => {
        // Group properties by state for the current landlord
        const groupedProperties = await prismaClient.properties.groupBy({
            by: ['state'],
            where: {
                landlordId, // Filter by the current landlordId
            },
        });

        // Object to store the grouped properties by state
        const propertiesByState = {};

        // Loop through each state group and fetch properties with apartments for that state
        for (const group of groupedProperties) {
            const state = group.state;

            // Fetch properties belonging to the current state and landlord, including apartments
            const properties = await prismaClient.properties.findMany({
                where: {
                    state,
                    landlordId,
                },
                include: {
                    apartments: true,
                },
            });

            // Store the properties in the result object under the respective state
            propertiesByState[state] = properties;
        }

        return propertiesByState;
    }
    // Function to aggregate properties by state for the current landlord
    getPropertiesByState = async () => {
        // Group properties by state for the current landlord
        const groupedProperties = await prismaClient.properties.groupBy({
            by: ['state'],
        });

        // Object to store the grouped properties by state
        const propertiesByState = {};

        // Loop through each state group and fetch properties with apartments for that state
        for (const group of groupedProperties) {
            const state = group.state;

            // Fetch properties belonging to the current state and landlord, including apartments
            const properties = await prismaClient.properties.findMany({
                where: {
                    state,
                },
                include: {
                    apartments: true,
                },
            });

            // Store the properties in the result object under the respective state
            propertiesByState[state] = properties;
        }

        return propertiesByState;
    }
    showCaseRentals = async (propertyId:string, landlordId:string) => {
        return await prismaClient.properties.update({
            where: {
                landlordId,
                id: propertyId,
            },
            data: {
                showCase: true
            }
        })
    }
    getShowCasedRentals = async (landlordId:string) => {
        return await prismaClient.properties.findMany({
            where: {
                landlordId,
                showCase:true
            }
        })
    }

    checkLandlordPropertyExist = async (landlordId: string, propertyId: string) => {

        return await prismaClient.properties.findFirst({
            where: {
                landlordId,
                id: propertyId
            }
        })
    }

    getPropertyExpenses = async (landlordId: string, propertyId: string) => {
        return await prismaClient.maintenance.findMany({
            where: {
                landlordId,
                propertyId,
            }
        })
    }
}


export default new PropertyService()