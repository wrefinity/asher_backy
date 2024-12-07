"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class PropertyService {
    constructor() {
        this.createProperty = (propertyData) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.create({
                data: Object.assign({}, propertyData)
            });
        });
        this.getProperties = () => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findMany({});
        });
        this.getPropertiesById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findUnique({
                where: { id },
            });
        });
        this.updateProperty = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.update({
                where: { id },
                data
            });
        });
        this.deleteProperty = (landlordId, id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.update({
                where: { id, landlordId },
                data: { isDeleted: true }
            });
        });
        this.updateAvailabiltyStatus = (landlordId, id, availability) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.update({
                where: { id, landlordId },
                data: { availability }
            });
        });
        // Function to aggregate properties by state for the current landlord
        this.aggregatePropertiesByState = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            // Group properties by state for the current landlord
            const groupedProperties = yield __1.prismaClient.properties.groupBy({
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
                const properties = yield __1.prismaClient.properties.findMany({
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
        });
        // Function to aggregate properties by state for the current landlord
        this.getPropertiesByState = () => __awaiter(this, void 0, void 0, function* () {
            // Group properties by state for the current landlord
            const groupedProperties = yield __1.prismaClient.properties.groupBy({
                by: ['state'],
            });
            // Object to store the grouped properties by state
            const propertiesByState = {};
            // Loop through each state group and fetch properties with apartments for that state
            for (const group of groupedProperties) {
                const state = group.state;
                // Fetch properties belonging to the current state and landlord, including apartments
                const properties = yield __1.prismaClient.properties.findMany({
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
        });
        this.showCaseRentals = (propertyId, landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.update({
                where: {
                    landlordId,
                    id: propertyId,
                },
                data: {
                    showCase: true
                }
            });
        });
        this.getShowCasedRentals = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findMany({
                where: {
                    landlordId,
                    showCase: true
                }
            });
        });
        this.checkLandlordPropertyExist = (landlordId, propertyId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findFirst({
                where: {
                    landlordId,
                    id: propertyId
                }
            });
        });
        this.getPropertyExpenses = (landlordId, propertyId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.maintenance.findMany({
                where: {
                    landlordId,
                    propertyId,
                }
            });
        });
    }
}
exports.default = new PropertyService();
