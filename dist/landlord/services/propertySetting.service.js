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
const __1 = require("../..");
class LandlordSettingsService {
    constructor() {
        this.createOrUpdate = (data) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertySettings.upsert({
                where: {
                    propertyId_settingType: {
                        propertyId: data.propertyId,
                        settingType: data.settingType,
                    },
                },
                update: Object.assign({}, data),
                create: Object.assign({}, data),
            });
        });
        this.getById = (id) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertySettings.findUnique({
                where: { id },
            });
        });
        this.getAll = () => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertySettings.findMany();
        });
        this.getLandlordPropsSetting = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertySettings.findMany({
                where: { landlordId }
            });
        });
        this.update = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertySettings.update({
                where: { id },
                data,
            });
        });
        this.delete = (id) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertySettings.delete({
                where: { id },
            });
        });
        this.createGlobalSetting = (data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.settings.create({ data });
        });
        this.getGlobalSettingById = (id) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.settings.findUnique({ where: { id } });
        });
        this.getAllGlobalSettings = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.settings.findMany({ where: { landlordId } });
        });
        this.getLandlordGlobalSettingWithStatus = (landlordId, type) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.settings.findFirst({
                where: Object.assign(Object.assign({}, (type ? { type } : {})), { landlordId })
            });
        });
        this.updateGlobalSetting = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.settings.update({
                where: { id },
                data,
            });
        });
        this.deleteGlobalSetting = (id) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.settings.update({ where: { id }, data: { isDeleted: true } });
        });
    }
}
exports.default = new LandlordSettingsService();
