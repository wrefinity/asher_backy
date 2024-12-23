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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const propertySetting_service_1 = __importDefault(require("../services/propertySetting.service"));
const settings_1 = require("../validations/schema/settings");
const error_service_1 = __importDefault(require("../../services/error.service"));
const propertyServices_1 = __importDefault(require("../../services/propertyServices"));
class SettingsController {
    constructor() {
        this.createPropApartmentSetting = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { error, value } = settings_1.propApartmentSettingsSchema.validate(req.body);
            console.log(error);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const propertiesId = value.propertyId;
                const propertyExist = yield propertyServices_1.default.checkLandlordPropertyExist(landlordId, propertiesId);
                if (!propertyExist)
                    return res.status(404).json({ message: "property does not exists" });
                if (!landlordId)
                    return res.status(404).json({ message: "Landlord not found" });
                const createdSettings = yield propertySetting_service_1.default.createOrUpdate(Object.assign(Object.assign({}, value), { landlordId }));
                return res.status(201).json({ createdSettings });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        // Retrieve a single PropApartmentSettings by ID
        this.getById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            try {
                const settings = yield propertySetting_service_1.default.getById(id);
                if (!settings) {
                    return res.status(404).json({ error: 'Settings not found' });
                }
                return res.status(200).json(settings);
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        // Retrieve all PropApartmentSettings records
        this.getAllPropsApartSetting = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const settings = yield propertySetting_service_1.default.getLandlordPropsSetting(landlordId);
                return res.status(200).json(settings);
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        // Update an existing PropApartmentSettings by ID
        this.updatePropsApartSetting = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const { error, value } = settings_1.propApartmentSettingsUpdateSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            try {
                const updatedSettings = yield propertySetting_service_1.default.update(id, value);
                return res.status(200).json({ updatedSettings });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        // Delete a PropApartmentSettings by ID
        this.deletePropsApartmentSetting = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            try {
                yield propertySetting_service_1.default.delete(id);
                return res.status(204).json();
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        // Create a new global setting for the landlord
        this.createGlobalSetting = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Validate request body against the schema
            const { error, value } = settings_1.GlobalSettingsSchema.validate(req.body);
            // If validation fails, return an error with the validation message
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            try {
                // Get landlord ID from authenticated user (assumed to be available in req.user)
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                // Call the service to create the setting, passing in landlordId and validated data
                const createdSettings = yield propertySetting_service_1.default.createGlobalSetting(Object.assign(Object.assign({}, value), { landlordId }));
                // Respond with the newly created setting data
                return res.status(201).json(createdSettings);
            }
            catch (err) {
                // Handle any errors using the error service
                error_service_1.default.handleError(err, res);
            }
        });
        // Retrieve all global settings associated with the landlord
        this.getAllGlobalSettings = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Get landlord ID from authenticated user
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                // Fetch all settings for the specified landlord
                const settings = yield propertySetting_service_1.default.getAllGlobalSettings(landlordId);
                // Return the retrieved settings
                res.status(200).json(settings);
            }
            catch (error) {
                // Handle any errors using the error service
                error_service_1.default.handleError(error, res);
            }
        });
        // Update a specific landlord's global setting
        this.updateLandlordGlobalSetting = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { id } = req.params;
                // Retrieve the setting by ID to confirm it belongs to the authenticated landlord
                const checkSetting = yield propertySetting_service_1.default.getGlobalSettingById(id);
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                // Verify that only the landlord who created the setting can update it
                if (checkSetting.landlordId != landlordId) {
                    return res.status(403).json({ message: "Only the landlord who created this setting can update it" });
                }
                // Update the setting with the provided data
                const setting = yield propertySetting_service_1.default.updateGlobalSetting(id, req.body);
                // If update is successful, return the updated setting; otherwise, send a 'not found' message
                if (setting)
                    return res.status(200).json({ setting });
                else
                    return res.status(404).json({ message: 'Setting not found' });
            }
            catch (error) {
                // Handle errors using the error service
                error_service_1.default.handleError(error, res);
            }
        });
        // Delete a specific landlord's global setting
        this.deleteLandlordGlobalSetting = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { id } = req.params;
                // Retrieve the setting by ID to confirm it belongs to the authenticated landlord
                const checkSetting = yield propertySetting_service_1.default.getGlobalSettingById(id);
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                // Verify that only the landlord who created the setting can delete it
                if (checkSetting.landlordId == landlordId) {
                    return res.status(403).json({ message: "Only the landlord who created this setting can delete it" });
                }
                // Delete the setting and confirm the deletion; otherwise, send a 'not found' message
                const setting = yield propertySetting_service_1.default.deleteGlobalSetting(id);
                if (setting)
                    res.status(200).json({ message: 'Setting deleted successfully' });
                else
                    res.status(404).json({ message: 'Setting not found' });
            }
            catch (error) {
                // Handle deletion errors and return a message
                res.status(500).json({ message: 'Error deleting setting', error });
            }
        });
    }
}
exports.default = new SettingsController();
