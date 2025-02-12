import fs from 'fs';
import { Response } from "express";
import ErrorService from "../../services/error.service";
import PropertyServices from "../../services/propertyServices";
import { createPropertyListingSchema, updatePropertyListingSchema, createPropertySchema } from "../../validations/schemas/properties.schema"
import { propAvailabiltySchema } from "../validations/schema/settings"
import { CustomRequest } from "../../utils/types";
import propertyPerformance from "../services/property-performance";
import { PropertyListingDTO } from "../validations/interfaces/propsSettings";
import { parseCSV, parseDateField } from "../../utils/filereader";
import { PropertySpecificationType, PropertyType } from "@prisma/client"
import TenantService from '../../services/tenant.service';
import stateServices from '../../services/state.services';


class PropertyController {
    constructor() { }

    createProperty = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        try {
            if (!landlordId) {
                return res.status(403).json({ error: 'kindly login' });
            }
            const { error, value } = createPropertySchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            const state = await stateServices.getStateByName(value?.state)
   
       
            const existance = await PropertyServices.getUniquePropertiesBaseLandlordNameState(
                landlordId,
                value?.name,
                state?.id,
                value.city
            );

            if (existance) {
                return res.status(400).json({ error: 'property exist for the state and city'});
            }
            const images = value.cloudinaryUrls;
            const videourl = value.cloudinaryVideoUrls;

            delete value['state']
            delete value['cloudinaryUrls']
            delete value['cloudinaryVideoUrls']
            delete value['cloudinaryAudioUrls']
            delete value['cloudinaryDocumentUrls']

            const rentalFee = value.rentalFee || 0;
            // const lateFee = rentalFee * 0.01;
            const property = await PropertyServices.createProperty({ ...value, stateId: state?.id, images, videourl, landlordId })
            return res.status(201).json({ property })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    showCaseRentals = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })

            const propertyId = req.params.propertyId;
            const property = await PropertyServices.showCaseRentals(propertyId, landlordId);
            if (!property) return res.status(200).json({ message: "No Property found" })
            return res.status(200).json({ property })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getShowCasedRentals = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })

            const property = await PropertyServices.getShowCasedRentals(landlordId);
            if (!property) return res.status(200).json({ message: "No Property found" })
            return res.status(200).json({ property })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    getCurrentLandlordProperties = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })
            const propertiesGrouped = await PropertyServices.aggregatePropertiesByState(landlordId);
            const propertiesUnGrouped = await PropertyServices.getPropertiesByLandlord(landlordId);
            return res.status(200).json({ propertiesGrouped, propertiesUnGrouped })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    categorizedPropsInRentals = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })
            const properties = await PropertyServices.getLandlordProperties(landlordId);
            // Group properties based on specificationType
            const categorizedProperties = {
                COMMERCIAL: properties.filter((prop) => prop.specificationType === PropertySpecificationType.COMMERCIAL),
                RESIDENTIAL: properties.filter((prop) => prop.specificationType === PropertySpecificationType.RESIDENTIAL),
                SHORTLET: properties.filter((prop) => prop.specificationType === PropertySpecificationType.SHORTLET),
            };
            return res.status(200).json({ data: categorizedProperties });
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }


    deleteLandlordProperties = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const propertiesId = req.params.propertyId;
            const propertyExist = await PropertyServices.checkLandlordPropertyExist(landlordId, propertiesId);
            if (!propertyExist) return res.status(404).json({ message: "property does not exists" })
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })
            const properties = await PropertyServices.deleteProperty(landlordId, propertiesId);
            if (!properties) return res.status(200).json({ message: "No Property listed yet" })
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    updatePropertyAvailability = async (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = propAvailabiltySchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            const landlordId = req.user?.landlords?.id;
            const propertiesId = req.params.propertyId;
            const propertyExist = await PropertyServices.checkLandlordPropertyExist(landlordId, propertiesId);
            if (!propertyExist) return res.status(404).json({ message: "property does not exists for this landlord" })
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })
            const property = await PropertyServices.updateAvailabiltyStatus(landlordId, propertiesId, value.availability);
            if (!property) return res.status(200).json({ message: "No Property listed yet" })
            return res.status(200).json({ property })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    getPropertyPerformance = async (req: CustomRequest, res: Response) => {
        const { entityId } = req.params;
        const { isApartment } = req.body
        if (!entityId) return res.status(400).json({ message: 'No propertyId provided' })
        try {
            const performance = await propertyPerformance.generateReport(entityId, isApartment);
            res.status(200).json(performance);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }
    getPropertyExpenses = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user
        const landlordId = landlords.id
        const { propertyId } = req.params;
        if (!propertyId) return res.status(400).json({ message: 'No propertyId provided' })
        try {
            const expenses = await PropertyServices.getPropertyExpenses(landlordId, propertyId);
            res.status(200).json(expenses);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

    getRentVSExpense = async (req: CustomRequest, res: Response) => {
        const { entityId } = req.params;
        const { isApartment, startDate, endDate } = req.body
        if (!entityId) return res.status(400).json({ message: 'No propertyId provided' })
        try {
            const rentVsExpense = await propertyPerformance.getRentVSExpenseMonthlyData(entityId, isApartment, startDate, endDate);
            res.status(200).json(rentVsExpense);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

    createPropertyListing = async (req: CustomRequest, res: Response) => {
        const { error, value } = createPropertyListingSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });
        try {
            const data: PropertyListingDTO = value;
            // check if property is owned by landlord
            const landlordId = req.user?.landlords?.id;
            const checkOwnership = await PropertyServices.checkLandlordPropertyExist(landlordId, value.propertyId);
            // scenario where property doesnot belong to landlord
            if (!checkOwnership) return res.status(400).json({ message: 'property does not exist under landlord' });

            const listing = await PropertyServices.createPropertyListing(data);
            return res.status(201).json({ message: 'Property listing created', listing });

        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }
    // this code get landlord listing of properties including 
    // using filters base on property size, type and location
    getLandlordPropertyListing = async (req: CustomRequest, res: Response) => {
        try {
            // Extract landlordId from the authenticated user
            const landlordId = req.user?.landlords?.id;

            if (!landlordId) {
                return res.status(400).json({ message: "Landlord not found" });
            }

            // Extract filters from the query parameters
            const { state, country, propertySize, type, isActive, specificationType } = req.query;

            // Prepare the filter object
            const filters: any = {
                landlordId,
            };

            // Add filters to the query if they are provided
            if (state) filters.property = { ...filters.property, state: String(state) };
            if (country) filters.property = { ...filters.property, country: String(country) };
            if (propertySize) filters.property = { ...filters.property, propertysize: Number(propertySize) };
            if (isActive) {
                // Convert isActive to a number
                const isActiveNumber = parseInt(isActive.toString(), 10);

                if (!isNaN(isActiveNumber)) {
                    filters.property = {
                        ...filters.property,
                        isActive: isActiveNumber === 1
                    };
                } else {
                    throw new Error(`Invalid isActive: ${isActive}. Must be one of integer 1 or 0 for active and inactive`);
                }
            }

            // Validate specificationType against the enum
            if (specificationType) {
                const isValidSpecificationType = Object.values(PropertySpecificationType).includes(specificationType as PropertySpecificationType);
                if (isValidSpecificationType) {
                    filters.property = { ...filters.property, specificationType: String(specificationType) };
                } else {
                    throw new Error(`Invalid specificationType: ${specificationType}. Must be one of ${Object.values(PropertySpecificationType).join(', ')}`);
                }
            }
            if (type) {
                const isValidType = Object.values(PropertyType).includes(type as PropertyType);
                if (isValidType) {
                    filters.property = { ...filters.property, type: String(type) };
                } else {
                    throw new Error(`Invalid type: ${type}. Must be one of ${Object.values(PropertyType).join(', ')}`);
                }
            }

            // Fetch the filtered properties
            const properties = await PropertyServices.getAllListedProperties(filters);

            console.log(landlordId)
            // Check if properties are found
            if (!properties || properties.length === 0) {
                return res.status(404).json({ message: "No properties found for this landlord with the given filters" });
            }

            // Return the filtered properties
            return res.status(200).json({ properties });
        } catch (err) {
            // Handle any errors
            ErrorService.handleError(err, res);
        }
    };

    getActiveOrInactivePropsListing = async (req: CustomRequest, res: Response) => {

        try {
            // Extract landlordId from the authenticated user
            const landlordId = req.user?.landlords?.id;

            if (!landlordId) {
                return res.status(400).json({ message: "Landlord not found" });
            }
            // get listing
            const activePropsListing = await PropertyServices.getActiveOrInactivePropsListing(landlordId);
            const inActivePropsListing = await PropertyServices.getActiveOrInactivePropsListing(landlordId, false);

            // Return the ative and inactive property listing
            return res.status(200).json({ activePropsListing, inActivePropsListing });

        } catch (err) {
            // Handle any errors
            ErrorService.handleError(err, res);
        }


    }
    updatePropsListing = async (req: CustomRequest, res: Response) => {

        try {
            const { error, value } = updatePropertyListingSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });
            const propertyId = req.params.propertyId;
            // Extract landlordId from the authenticated user
            const landlordId = req.user?.landlords?.id;

            if (!landlordId) {
                return res.status(400).json({ message: "Landlord not found" });
            }
            // update listing
            const listing = await PropertyServices.updatePropertyListing(value, propertyId, landlordId);

            // Return the update property listing
            return res.status(200).json({ listing });

        } catch (err) {
            // Handle any errors
            ErrorService.handleError(err, res);
        }


    }

    bulkPropsUpload = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'Kindly login as landlord' });
            }
            if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded.' });
    
            const filePath = req.file.path;
            // Read and process the CSV file
            const dataFetched = await parseCSV(filePath);
            let uploaded = [];
    
            interface UploadError {
                name: string;
                errors: string[];
            }
    
            let uploadErrors: UploadError[] = [];
    
            for (const row of dataFetched) {
                try {
                    // Convert semicolon-separated amenities string to an array
                    if (row.amenities && typeof row.amenities === 'string') {
                        row.amenities = row.amenities.split(';').map(item => item.trim());
                    }
                    // Parse date fields
                    row.yearBuilt = parseDateField(row.yearBuilt);
                    row.dueDate = parseDateField(row.dueDate);
    
                    // Validate the row using Joi validations
                    const { error, value } = createPropertySchema.validate(row, { abortEarly: false });
                    if (error) {
                        const existingError = uploadErrors.find(err => err.name === row.name);
                        if (existingError) {
                            existingError.errors.push(...error.details.map(detail => detail.message));
                        } else {
                            uploadErrors.push({
                                name: Array.isArray(row.name) ? row.name[0] : row.name,
                                errors: [...error.details.map(detail => detail.message)],
                            });
                        }
                        continue;
                    }
                    const state = await stateServices.getStateByName(Array.isArray(row.state) ? row.state[0] : row.state)
    
                    const existance = await PropertyServices.getUniquePropertiesBaseLandlordNameState(
                        landlordId,
                        Array.isArray(row.name) ? row.name[0] : row.name,
                        state?.id,
                        Array.isArray(row.city) ? row.city[0] : row.city
                    );
    
                    if (existance) {
                        const existingError = uploadErrors.find(err => err.name === row.name);
                        if (existingError) {
                            existingError.errors.push('Property already exists');
                        } else {
                            uploadErrors.push({
                                name: Array.isArray(row.name) ? row.name[0] : row.name,
                                errors: ['Property already exists'],
                            });
                        }
                        continue;
                    }
    
                    const property = await PropertyServices.createProperty({ ...value, landlordId });
                    uploaded.push(property);
                } catch (err) {
                    const existingError = uploadErrors.find(error => error.name === row.name);
                    if (existingError) {
                        existingError.errors.push(`Unexpected error: ${err.message}`);
                    } else {
                        uploadErrors.push({
                            name: Array.isArray(row.name) ? row.name[0] : row.name,
                            errors: [`Unexpected error: ${err.message}`],
                        });
                    }
                }
            }
    
            // Delete the file after processing if needed
            fs.unlinkSync(filePath);
    
            // Determine response based on upload results
            if (uploaded.length > 0) {
                return res.status(200).json({ uploaded, uploadErrors });
            } else {
                return res.status(400).json({ error: 'No property was uploaded.', uploadErrors });
            }
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };

    // Get all tenants for a specific property
    getTenantsForProperty = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId; // Get propertyId from the request params

            // Step 1: Validate the property exists (optional)
            const property = await PropertyServices.getPropertyById(propertyId);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }

            // Step 2: Retrieve all tenants for the given property
            const tenant = await TenantService.getTenantsByLeaseStatus(propertyId);
            // Step 3: Return the list of tenants
            return res.status(200).json({
                tenant
            });

        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };

    getPropertiesWithoutTenants = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'Kindly login as landlord' });
            }
            // Get the properties without tenants
            const properties = await PropertyServices.getPropertiesWithoutTenants(landlordId);

            // Return the properties
            return res.status(200).json(properties);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };
}
export default new PropertyController() 