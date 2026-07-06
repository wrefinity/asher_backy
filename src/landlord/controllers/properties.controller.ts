import fs from 'fs';
import { prismaClient } from '../..';
import { Response } from "express";
import ErrorService from "../../services/error.service";
import PropertyServices from "../../services/propertyServices";
import { createPropertyListingSchema, updatePropertyListingSchema, createPropertySchema, updatePropertySchema, IBasePropertyDTOSchema, unitConfigurationSchema, roomDetailSchema, BulkPropertyUploadSchema } from "../../validations/schemas/properties.schema"
import { IPropertySpecificationDTO } from "../../validations/interfaces/properties.interface"
import { propAvailabiltySchema } from "../validations/schema/settings"
import { CustomRequest } from "../../utils/types";
import propertyPerformance from "../services/property-performance";
import { PropertyListingDTO } from "../validations/interfaces/propsSettings";
import { parseCSV } from "../../utils/filereader";
import { PropertySpecificationType, PropertyType } from "@prisma/client"
import TenantService from '../../services/tenant.service';
import stateServices from '../../services/state.services';
import profileServices from '../../services/profileServices';
import userServices from '../../services/user.services';
import propertyUploadServices from '../../services/property.upload.services';
import propertyRoomService from '../../services/property.room.service';
import propertyUnitService from '../../services/property.unit.service';
import commercialServices from '../../services/commercial.services';
import residentialServices from '../../services/residential.services';
import maintenanceService from '../../services/maintenance.service';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import {
    buildCurrencyDisplayOptions,
    getClientIpFromRequest,
    resolvePropertyCreateCurrency,
    resolveViewerCurrency,
} from '../../utils/currencyContext';
import { duplicatePropertyForLandlord } from '../../services/propertyDuplicate.service';
import {
    alignPropertyListingMarketFields,
    assertPropertyEligibleForTenantListing,
    validateListingMarketFields,
} from '../../utils/listingMarketGuardrails';

const BULK_PROPERTY_CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    const workers = Array.from(
        { length: Math.min(Math.max(concurrency, 1), items.length) },
        async () => {
            while (true) {
                const index = nextIndex++;
                if (index >= items.length) return;
                results[index] = await mapper(items[index], index);
            }
        }
    );

    await Promise.all(workers);
    return results;
}


class PropertyController {
    constructor() { }


    createProperties = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        try {
            if (!landlordId) {
                return res.status(403).json({ error: 'Kindly login' });
            }

            const value = req.body;
            const state = await stateServices.getStateByName(
                value?.state,
                landlordId,
                value?.country
            );
            if (!state) {
                return res.status(400).json({ error: 'State not found' });
            }

            const count = value.count || 1;
            const results = {
                created: [] as any[],
                failed: [] as { name: string, error: string }[]
            };

            for (let i = 1; i <= count; i++) {
                try {

                    const numberedName = count > 1
                        ? `${value.name} ${i.toString().padStart(2, '0')}`
                        : value.name;

                    // Check property existence
                    const existance = await PropertyServices.getUniquePropertiesBaseLandlordNameState(
                        landlordId,
                        numberedName,
                        state.id,
                        value.city
                    );

                    if (existance) {
                        results.failed.push({
                            name: numberedName,
                            error: 'Property already exists for this state and city'
                        });
                        continue;
                    }

                    const {
                        uploadedFiles = [],
                        specificationType,
                        propertySubType,
                        otherTypeSpecific,
                        count: _,
                        commercial,
                        shortlet,
                        residential,
                        operationalProfileJson,
                        operationalProfile,
                        ...data
                    } = value;

                    let alignedCountry = data.country;
                    let alignedCurrency: string;
                    try {
                        const aligned = alignPropertyListingMarketFields(
                            data.country,
                            data.currency ??
                                (await resolvePropertyCreateCurrency({
                                    currency: data.currency,
                                    country: data.country,
                                    userId: req.user?.id,
                                }))
                        );
                        alignedCountry = aligned.country;
                        alignedCurrency = aligned.currency;
                    } catch (guardError) {
                        results.failed.push({
                            name: numberedName,
                            error:
                                guardError instanceof Error
                                    ? guardError.message
                                    : 'Invalid property country or currency',
                        });
                        continue;
                    }

                    const specification: IPropertySpecificationDTO = {
                        propertySubType,
                        specificationType,
                        otherTypeSpecific,
                        commercial,
                        shortlet,
                        residential
                    };

                    const property = await PropertyServices.createProperties(
                        {
                            ...data,
                            name: numberedName,
                            stateId: state.id,
                            landlordId,
                            country: alignedCountry,
                            currency: alignedCurrency,
                        },
                        specification,
                        uploadedFiles,
                        req.user?.id
                    );

                    const operationalRaw =
                        operationalProfileJson ??
                        operationalProfile ??
                        value.operationalProfileJson;
                    if (operationalRaw && property?.id) {
                        const PropertyOperationalService = (
                            await import('../../services/propertyOperational.service')
                        ).default;
                        await PropertyOperationalService.syncOperationalProfileFromRaw(
                            property.id,
                            landlordId,
                            operationalRaw
                        );
                    }

                    results.created.push(property);
                } catch (error) {
                    const numberedName = `${value.name} ${i.toString().padStart(2, '0')}`;
                    results.failed.push({
                        name: numberedName,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            return res.status(results.created.length > 0 ? 201 : 400).json(results);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };

    createPropertiesBulk = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        if (!landlordId) return res.status(403).json({ error: 'Kindly login' });

        // BulkPropertyUploadSchema validates an array; body may be array or { properties: array }
        const properties = Array.isArray(req.body) ? req.body : (req.body?.properties ?? []);
        const results = { created: [], failed: [] };

        for (const prop of properties) {
            try {
                const stateName = prop?.state?.trim();
                if (!stateName) throw new Error('State is required');
                const state = await stateServices.getStateByName(
                    stateName,
                    landlordId,
                    prop.country
                );
                if (!state) throw new Error('State not found');

                const {
                    uploadedFiles = [],
                    specificationType,
                    propertySubType,
                    otherTypeSpecific,
                    commercial,
                    shortlet,
                    residential,
                    count = 1,
                    operationalProfileJson,
                    operationalProfile,
                    ...data
                } = prop;

                const specification: IPropertySpecificationDTO = {
                    specificationType,
                    propertySubType,
                    otherTypeSpecific,
                    commercial,
                    shortlet,
                    residential
                };

                let alignedCountry = data.country;
                let alignedCurrency: string;
                try {
                    const aligned = alignPropertyListingMarketFields(
                        data.country,
                        data.currency ??
                            (await resolvePropertyCreateCurrency({
                                currency: data.currency,
                                country: data.country,
                                userId: req.user?.id,
                            }))
                    );
                    alignedCountry = aligned.country;
                    alignedCurrency = aligned.currency;
                } catch (guardError) {
                    results.failed.push({
                        name: prop?.name || 'Unknown',
                        error:
                            guardError instanceof Error
                                ? guardError.message
                                : 'Invalid property country or currency',
                    });
                    continue;
                }

                for (let i = 1; i <= count; i++) {
                    const numberedName = count > 1
                        ? `${prop.name} ${i.toString().padStart(2, '0')}`
                        : prop.name;
                    const exist = await PropertyServices.getUniquePropertiesBaseLandlordNameState(
                        landlordId,
                        numberedName,
                        state.id,
                        prop.city
                    );

                    if (exist) {
                        results.failed.push({ name: numberedName, error: 'Property already exists' });
                        continue;
                    }

                    const property = await PropertyServices.createProperties(
                        {
                            ...data,
                            name: numberedName,
                            stateId: state.id,
                            landlordId,
                            country: alignedCountry,
                            currency: alignedCurrency,
                        },
                        specification,
                        uploadedFiles,
                        req.user?.id
                    );

                    const operationalRaw =
                        operationalProfileJson ??
                        operationalProfile ??
                        prop['Operational Profile JSON'];
                    if (operationalRaw && property?.id) {
                        const PropertyOperationalService = (
                            await import('../../services/propertyOperational.service')
                        ).default;
                        await PropertyOperationalService.syncOperationalProfileFromRaw(
                            property.id,
                            landlordId,
                            operationalRaw
                        );
                    }

                    results.created.push(property);
                }
            } catch (err: any) {
                results.failed.push({
                    name: prop?.name || 'Unknown',
                    error: err?.message || 'Unknown error'
                });
            }
        }
        return res.status(results.created.length ? 201 : 400).json(results);
    };

    createRoom = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        const { error, value } = roomDetailSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ error: error.details });
        }

        if (value.residentialPropertyId) {
            // check existences of the residential
            const avail = await residentialServices.getResidentialPropertyById(value.residentialPropertyId)
            if (!avail) { return res.status(400).json({ message: "residential property not found" }) }
        }
        if (value.commercialPropertyId) {
            // check existences of the commercial
            const avail = await commercialServices.getCommercialPropertyById(value.commercialPropertyId)
            if (!avail) { return res.status(400).json({ message: "commercial property not found" }) }
        }
        try {
            const {
                uploadedFiles, ...data
            } = value
            delete data['documentName']
            delete data['docType']
            delete data['idType']
            delete data['uploadedFiles']

            const room = await propertyRoomService.createRoomDetail({ ...data, uploadedFiles })
            if (!room) return res.status(400).json({ message: "room creation failed" })
            return res.status(201).json({ room })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    createUnit = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;

        const { error, value } = unitConfigurationSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ error: error.details });
        }

        if (value.residentialPropertyId) {
            // check existences of the residential
            const avail = await residentialServices.getResidentialPropertyById(value.residentialPropertyId)
            if (!avail) { return res.status(400).json({ message: "residential property not found" }) }
        }
        if (value.commercialPropertyId) {
            // check existences of the commercial
            const avail = await commercialServices.getCommercialPropertyById(value.commercialPropertyId)
            if (!avail) { return res.status(400).json({ message: "commercial property not found" }) }
        }
        try {
            const {
                uploadedFiles, ...data
            } = value
            delete data['documentName']
            delete data['docType']
            delete data['idType']
            delete data['uploadedFiles']

            const unit = await propertyUnitService.createUnitDetail({ ...data, uploadedFiles })
            if (!unit) return res.status(400).json({ message: "unit creation failed" })
            return res.status(201).json({ unit })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    /**
       * Update single property
    */
    updateProperties = async (req: CustomRequest, res: Response) => {
        try {
      const propertyId = req.params.propertyId;
      const landlordId = req.user?.landlords?.id;
      const userId = req.user?.id;

      if (!landlordId) {
        return res.status(403).json(
          ApiError.forbidden('Landlord authentication required')
        );
      }

      // Check if property belongs to landlord
      const existingProperty = await PropertyServices.getPropertyById(propertyId);
      
      if (!existingProperty) {
        return res.status(404).json(
          ApiError.notFound('Property not found')
        );
      }

      if (existingProperty.landlordId !== landlordId) {
        return res.status(403).json(
          ApiError.forbidden('You do not have permission to update this property')
        );
      }

      const updateData = { ...req.body };

      if (updateData.country !== undefined || updateData.currency !== undefined) {
        const nextCountry = updateData.country ?? existingProperty.country;
        const nextCurrency = updateData.currency ?? existingProperty.currency;
        const validation = validateListingMarketFields(nextCountry, nextCurrency);
        if (!validation.ok) {
          return res.status(400).json(
            ApiError.badRequest(validation.errors.join(' '))
          );
        }
        if (validation.canonicalCountry) {
          updateData.country = validation.canonicalCountry;
        }
        if (validation.expectedCurrency) {
          updateData.currency = validation.expectedCurrency;
        }
      }
      
      // Handle state update if provided
      let stateId = existingProperty.stateId;
      if (updateData.state) {
        const state = await stateServices.getStateByName(
          updateData.state,
          landlordId,
          updateData.country ?? existingProperty.country
        );
        if (!state) {
          return res.status(400).json(
            ApiError.badRequest('State not found')
          );
        }
        stateId = state.id;
      }

      // Update property
      const updatedProperty = await PropertyServices.updateProperty(
        propertyId,
        {
          ...updateData,
          stateId,
          landlordId
        },
        req.body.uploadedFiles || [],
        userId
      );

      return res.status(200).json(
        ApiResponse.success(updatedProperty, 'Property updated successfully')
      );
    } catch (error: any) {
      console.error('Update property error:', error);
      return res.status(500).json(
        ApiError.internal(error.message)
      );
    }
    };

    getCurrentLandlordProperties = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })
            const ipAddress = getClientIpFromRequest(req);
            const viewerContext = await resolveViewerCurrency({
                userId: req.user?.id,
                currency: req.query.currency as string | undefined,
                displayCurrency: req.query.displayCurrency as string | undefined,
                country: req.query.country as string | undefined,
                countryCode: req.query.countryCode as string | undefined,
                ipAddress,
            });
            const {
                propertiesGrouped,
                stateCountryByKey,
                stateNameByKey,
                stateIdByKey,
            } = await PropertyServices.aggregatePropertiesByState(landlordId);
            const propertiesUnGrouped = await PropertyServices.getPropertiesByLandlord(landlordId);
            return res.status(200).json({
                propertiesGrouped,
                propertiesUnGrouped,
                stateCountryByKey,
                stateNameByKey,
                stateIdByKey,
                viewerContext,
            })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    getPropertyBasedOnUserPreference = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const userId = req.params.userId;
            // validate user existence
            const userExist = await userServices.findAUserById(userId);

            if (!userExist) {
                return res.status(400).json({ message: "user doesnt exist" });
            }
            const preferences = await profileServices.activeSearchPreference(userId);
            if (preferences.length <= 0) {
                return res.status(400).json({ message: "user have not set active search preference" });
            }
            const properties = await PropertyServices.getPropertyOnUserPreference(preferences, landlordId);
            return res.status(201).json({ properties });

        } catch (error) {
            ErrorService.handleError(error, res);
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

    duplicateProperty = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const { propertyId } = req.params;

            if (!landlordId) {
                return res.status(403).json({ error: 'Kindly login' });
            }

            const duplicated = await duplicatePropertyForLandlord(
                landlordId,
                propertyId,
                req.user?.id
            );

            return res.status(201).json({
                message: 'Property duplicated successfully',
                property: duplicated,
            });
        } catch (error: any) {
            const rawMessage = String(error?.message ?? '');
            if (
                rawMessage.includes('PrismaClientValidationError') ||
                rawMessage.includes('Unknown argument')
            ) {
                return res.status(400).json({
                    message: 'Could not duplicate this property. Some of its data is not compatible with a copy.',
                    error: 'Property duplicate failed',
                });
            }
            ErrorService.handleError(error, res);
        }
    };

    deleteLandlordProperties = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const propertiesId = req.params.propertyId;
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })

            const propertyExist = await PropertyServices.checkLandlordPropertyExist(landlordId, propertiesId);
            if (!propertyExist) return res.status(404).json({ message: "property does not exists" })
            if (propertyExist.isDeleted) {
                return res.status(410).json({ message: "Property has already been deleted" })
            }

            if (landlordId !== propertyExist.landlordId) {
                return res.status(403).json({ message: "Only the property owner can delete this property" })
            }

            const deleted = await PropertyServices.deleteProperty(landlordId, propertiesId);
            return res.status(200).json({
                message: "Property deleted successfully",
                property: deleted,
            })
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
            const property = await PropertyServices.updateAvailabiltyStatus(
                landlordId,
                propertiesId,
                value.availability,
                req.user?.id
            );
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
        console.log("createPropertyListing service data:", req.body);
        try {
            const data: PropertyListingDTO = req.body;
            const landlordId = req.user?.landlords?.id;

            const checkOwnership = await PropertyServices.checkLandlordPropertyExist(
                landlordId,
                data.propertyId
            );

            if (!checkOwnership)
                return res.status(400).json({ message: 'property does not exist under landlord' });

            try {
                assertPropertyEligibleForTenantListing({
                    country: checkOwnership.country,
                    currency: checkOwnership.currency,
                });
            } catch (guardError) {
                return res.status(400).json({
                    message:
                        guardError instanceof Error
                            ? guardError.message
                            : 'Property cannot be listed for tenants',
                });
            }

            // Validate unit IDs and room IDs in parallel using bulk lookups instead of
            // sequential per-ID queries, which reduces N+M round-trips to at most 2.
            const unitIds: string[] = Array.isArray(data.unitId) ? data.unitId : [];
            const roomIds: string[] = Array.isArray(data.roomId) ? data.roomId : [];

            const [foundUnits, foundRooms] = await Promise.all([
                unitIds.length > 0
                    ? prismaClient.unitConfiguration.findMany({
                        where: { id: { in: unitIds } },
                        select: { id: true },
                    })
                    : Promise.resolve([]),
                roomIds.length > 0
                    ? prismaClient.roomDetail.findMany({
                        where: { id: { in: roomIds } },
                        select: { id: true },
                    })
                    : Promise.resolve([]),
            ]);

            if (unitIds.length > 0) {
                const foundUnitIds = new Set(foundUnits.map((u: { id: string }) => u.id));
                const missingUnit = unitIds.find((uid) => !foundUnitIds.has(uid));
                if (missingUnit) {
                    return res.status(400).json({ message: `Invalid unit ID: ${missingUnit}` });
                }
            }

            if (roomIds.length > 0) {
                const foundRoomIds = new Set(foundRooms.map((r: { id: string }) => r.id));
                const missingRoom = roomIds.find((rid) => !foundRoomIds.has(rid));
                if (missingRoom) {
                    return res.status(400).json({ message: `Invalid room ID: ${missingRoom}` });
                }
            }

            const listing = await PropertyServices.createPropertyListing({
                ...data,
                listAs: checkOwnership.specificationType,
                createdById: req.user?.id,
            });
            return res.status(201).json(listing);
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    };

    unListPropertyListing = async (req: CustomRequest, res: Response) => {
        const propertyId = req.params.propertyId
        try {
            const landlordId = req.user?.landlords?.id;
            const checkOwnership = await PropertyServices.checkLandlordPropertyExist(landlordId, propertyId);
            // scenario where property doesnot belong to landlord
            if (!checkOwnership) return res.status(404).json({ message: 'property does not exist under landlord' });
            const unlisted = await PropertyServices.deletePropertyListing(
                propertyId,
                req.user?.id
            );
            return res.status(200).json({ message: 'Property unlisted', unlisted });
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }

    // using filters base on property size, type and location
    getLandlordPropertyListing = async (req: CustomRequest, res: Response) => {
        try {
            // Extract landlordId from the authenticated user
            const landlordId = req.user?.landlords?.id;

            if (!landlordId) {
                return res.status(400).json({ message: "Landlord not found" });
            }

            // Extract filters from the query parameters
            const {
                state,
                country,
                propertySize,
                type,
                isActive,
                specificationType,
                currency,
                displayCurrency,
                countryCode,
            } = req.query;

            // Prepare the filter object
            const filters: any = {
                landlordId,
            };

            console.log("checker", filters)

            // Add filters to the query if they are provided
            if (state) filters.property = { ...filters.property, state: String(state) };
            if (country) filters.property = { ...filters.property, country: String(country) };
            if (propertySize) filters.property = { ...filters.property, propertysize: Number(propertySize) };
            if (isActive) {
                // Convert isActive to a number
                const isActiveNumber = parseInt(isActive.toString(), 10);
                console.log("checker", isActiveNumber)
                if (!isNaN(isActiveNumber)) {
                    filters.property = {
                        ...filters.property,
                        isActive: isActiveNumber == 1
                    };
                } else {
                    return res.status(400).json(`Invalid isActive: ${isActive}. Must be one of integer 1 or 0 for active and inactive`);
                }
            }

            // Validate specificationType against the enum
            if (specificationType) {
                const isValidSpecificationType = Object.values(PropertySpecificationType).includes(specificationType as PropertySpecificationType);
                if (isValidSpecificationType) {
                    filters.property = { ...filters.property, specificationType: String(specificationType) };
                } else {
                    return res.status(400).json(`Invalid specificationType: ${specificationType}. Must be one of ${Object.values(PropertySpecificationType).join(', ')}`);
                }
            }
            if (type) {
                const isValidType = Object.values(PropertyType).includes(type as PropertyType);
                if (isValidType) {
                    filters.property = { ...filters.property, type: String(type) };
                } else {
                    return res.status(400).json(`Invalid type: ${type}. Must be one of ${Object.values(PropertyType).join(', ')}`);
                }
            }

            const ipAddress = getClientIpFromRequest(req);
            const viewerContext = await resolveViewerCurrency({
                userId: req.user?.id,
                currency: currency as string | undefined,
                displayCurrency: displayCurrency as string | undefined,
                country: country as string | undefined,
                countryCode: countryCode as string | undefined,
                ipAddress,
            });
            const currencyOptions = buildCurrencyDisplayOptions(viewerContext, ipAddress);

            // Fetch the filtered properties with display currency conversion
            const properties = await PropertyServices.getAllListedProperties(
                filters,
                0,
                1000,
                true,
                currencyOptions
            );
            // Check if properties are found
            if (!properties || properties.length === 0) {
                return res.status(404).json({
                    message: "No properties found for this landlord with the given filters",
                    viewerContext,
                });
            }

            // Return the filtered properties
            return res.status(200).json({ properties, viewerContext });
        } catch (err) {
            // Handle any errors
            ErrorService.handleError(err, res);
        }
    };

    getActivePropsListing = async (req: CustomRequest, res: Response) => {

        try {
            // Extract landlordId from the authenticated user
            const landlordId = req.user?.landlords?.id;

            if (!landlordId) {
                return res.status(400).json({ message: "Landlord not found" });
            }
            // get listing
            // const activePropsListing = await PropertyServices.getActiveOrInactivePropsListing(landlordId);
            const activePropsListing = await PropertyServices.getPropertyListingDetails(landlordId);

            // Return the ative and inactive property listing
            return res.status(200).json({ activePropsListing });

        } catch (err) {
            // Handle any errors
            ErrorService.handleError(err, res);
        }


    }
    getInactivePropsListing = async (req: CustomRequest, res: Response) => {

        try {
            // Extract landlordId from the authenticated user
            const landlordId = req.user?.landlords?.id;

            if (!landlordId) {
                return res.status(400).json({ message: "Landlord not found" });
            }
            // get listing
            // const inActivePropsListing = await PropertyServices.getActiveOrInactivePropsListing(landlordId, false, AvailabilityStatus.OCCUPIED);
            const inActivePropsListing = await PropertyServices.getInactiveListings(landlordId);

            // Return the ative and inactive property listing
            return res.status(200).json({ inActivePropsListing });

        } catch (err) {
            // Handle any errors
            ErrorService.handleError(err, res);
        }


    }

    updatePropsListing = async (req: CustomRequest, res: Response) => {

        try {
            const { error, value } = updatePropertyListingSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });
            const listedId = req.params.listedId;
            // Extract landlordId from the authenticated user
            const landlordId = req.user?.landlords?.id;

            if (!landlordId) {
                return res.status(400).json({ message: "Landlord not found" });
            }
            // update listing
            const listing = await PropertyServices.updatePropertyListing(value, listedId, landlordId);

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
                row?: any;
            }

            type UploadResult =
                | { uploaded: any; error?: undefined }
                | { uploaded?: undefined; error: UploadError };

            const rowResults = await mapWithConcurrency<any, UploadResult>(
                dataFetched,
                BULK_PROPERTY_CONCURRENCY,
                async (row) => {
                const rowName = Array.isArray(row.name) ? row.name[0] : row.name;
                try {
                    const propertyType = row.specificationType as PropertySpecificationType;
                    const propertyDto = await propertyUploadServices.transformRowToDto(row, propertyType);

                    const { error, value } = IBasePropertyDTOSchema.validate(propertyDto, { abortEarly: false });
                    if (error) {
                        return {
                            error: {
                                name: rowName,
                                errors: error.details.map(detail => detail.message),
                            },
                        };
                    }

                    const state = await stateServices.getStateByName(Array.isArray(row.state) ? row.state[0] : row.state)

                    const existance = await PropertyServices.getUniquePropertiesBaseLandlordNameState(
                        landlordId,
                        Array.isArray(row.name) ? row.name[0] : row.name,
                        state?.id,
                        Array.isArray(row.city) ? row.city[0] : row.city
                    );

                    if (existance) {
                        return {
                            error: {
                                name: rowName,
                                errors: ['Property already exists'],
                            },
                        };
                    }

                    delete value["state"]

                    const {
                        uploadedFiles,
                        specificationType,
                        propertySubType,
                        otherTypeSpecific,
                        commercial,
                        shortlet,
                        residential,
                        operationalProfileJson,
                        operationalProfile,
                        ...data
                    } = value

                    delete data['documentName']
                    delete data['docType']
                    delete data['idType']
                    delete data['uploadedFiles']

                    const specification: IPropertySpecificationDTO = {
                        propertySubType: propertySubType,
                        specificationType: specificationType,
                        otherTypeSpecific,
                        commercial,
                        shortlet,
                        residential
                    }
                    delete specification["PropertySpecification"]
                    console.log(specification)

                    // const lateFee = rentalFee * 0.01;
                    const property = await PropertyServices.createProperties({ ...data, stateId: state?.id, landlordId }, specification, uploadedFiles, req.user?.id)

                    const operationalRaw =
                        operationalProfileJson ??
                        operationalProfile ??
                        row.operationalProfileJson ??
                        row['Operational Profile JSON'];
                    if (operationalRaw && property?.id) {
                        const PropertyOperationalService = (
                            await import('../../services/propertyOperational.service')
                        ).default;
                        await PropertyOperationalService.syncOperationalProfileFromRaw(
                            property.id,
                            landlordId,
                            operationalRaw
                        );
                    }

                    return { uploaded: property };
                } catch (err: any) {
                    return {
                        error: {
                            name: rowName,
                            errors: [`Unexpected error: ${err?.message || 'Unknown error'}`],
                        },
                    };
                }
            });

            uploaded = rowResults
                .filter((result): result is { uploaded: any } => 'uploaded' in result)
                .map(result => result.uploaded);
            const uploadErrors = rowResults
                .filter((result): result is { error: UploadError } => 'error' in result)
                .map(result => result.error);

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
    updateProperty = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const landlordId = req.user?.landlords?.id;

            if (!landlordId) {
                return res.status(400).json({ message: "Landlord not found" });
            }


            // Verify that the property belongs to the landlord
            const property = await PropertyServices.getPropertyById(propertyId);
            if (!property || property.landlordId !== landlordId) {
                return res.status(404).json({ message: "Property not found or access denied" });
            }

            const updatedProperty = await PropertyServices.updateProperty(propertyId, req.body, [], req.user?.id);

            return res.status(200).json({ property: updatedProperty });

        } catch (err) {
            // Handle any errors
            ErrorService.handleError(err, res);
        }
    }

    getScheduledRentChanges = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const landlordId = req.user?.landlords?.id;

            if (!landlordId) {
                return res.status(400).json({ message: "Landlord not found" });
            }

            const property = await PropertyServices.getPropertyById(propertyId);
            if (!property || property.landlordId !== landlordId) {
                return res.status(404).json({ message: "Property not found or access denied" });
            }

            const { getPropertyScheduledRentChanges } = await import(
                '../../services/tenancyChangeNotification.service'
            );
            const scheduled = await getPropertyScheduledRentChanges(propertyId);

            return res.status(200).json({ scheduledRentChanges: scheduled });
        } catch (err) {
            ErrorService.handleError(err, res);
        }
    }

    syncPropertyListingStatus = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const landlordId = req.user?.landlords?.id;

            if (!landlordId) {
                return res.status(400).json({ message: "Landlord not found" });
            }

            // Verify that the property belongs to the landlord
            const property = await PropertyServices.getPropertyById(propertyId);
            if (!property || property.landlordId !== landlordId) {
                return res.status(404).json({ message: "Property not found or access denied" });
            }

            const result = await PropertyServices.syncPropertyListingStatus(propertyId);

            return res.status(200).json({
                message: "Property listing status synced successfully",
                result
            });

        } catch (err) {
            // Handle any errors
            ErrorService.handleError(err, res);
        }
    }

    updateShortletSettings = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const landlordId = req.user?.landlords?.id;

            if (!landlordId) {
                return res.status(400).json({ message: "Landlord not found" });
            }

            // Verify that the property belongs to the landlord
            const property = await PropertyServices.getPropertyById(propertyId);
            if (!property || property.landlordId !== landlordId) {
                return res.status(404).json({ message: "Property not found or access denied" });
            }

            const updatedProperty = await PropertyServices.updateShortletSettings(propertyId, req.body);

            return res.status(200).json({ success: true, property: updatedProperty });

        } catch (err: any) {
            // Handle any errors
            ErrorService.handleError(err, res);
        }
    }

    setShortletMode = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const landlordId = req.user?.landlords?.id;
            const enabled = Boolean(req.body?.enabled);

            if (!landlordId) {
                return res.status(400).json({ message: "Landlord not found" });
            }

            const property = await PropertyServices.getPropertyById(propertyId);
            if (!property || property.landlordId !== landlordId) {
                return res.status(404).json({ message: "Property not found or access denied" });
            }

            const updatedProperty = await PropertyServices.setShortletMode(propertyId, enabled);

            return res.status(200).json({ success: true, property: updatedProperty });
        } catch (err: any) {
            ErrorService.handleError(err, res);
        }
    }

    // Get vendors for a property (with landlord authorization)
    getVendorsForProperty = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const landlordId = req.user?.landlords?.id;

            if (!landlordId) {
                return res.status(403).json({ error: 'Landlord authorization required' });
            }

            // Verify the property belongs to this landlord
            const property = await PropertyServices.getPropertyById(propertyId);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }

            if (property.landlordId !== landlordId) {
                return res.status(403).json({ error: 'Unauthorized: Property does not belong to this landlord' });
            }

            // Get vendors for this property
            const vendors = await maintenanceService.getVendorsForPropertyMaintenance(propertyId);

            // Transform the response to match frontend expectations
            // The service returns { current, previous, future } but frontend expects { current, past }
            const transformedVendors = {
                current: vendors.current || [],
                past: vendors.previous || [], // Map previous to past
            };

            return res.status(200).json({ vendors: transformedVendors });
        } catch (error: any) {
            ErrorService.handleError(error, res);
        }
    }
}
export default new PropertyController()

