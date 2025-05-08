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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class ComplaintServices {
    constructor() {
        this.createComplaint = (data) => __awaiter(this, void 0, void 0, function* () {
            const { propertyId, createdById } = data, rest = __rest(data, ["propertyId", "createdById"]);
            try {
                return yield __1.prismaClient.complaint.create({
                    data: Object.assign(Object.assign({}, rest), { property: propertyId ? { connect: { id: propertyId } } : undefined, createdBy: createdById ? { connect: { id: createdById } } : undefined }),
                });
            }
            catch (error) {
                throw new Error(`Failed to create complaint: ${error.message}`);
            }
        });
        this.getAllComplaints = (createdById) => __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.complaint.findMany({
                    where: { isDeleted: false, createdById },
                    include: { createdBy: true, property: true },
                });
            }
            catch (error) {
                throw new Error(`Failed to fetch complaints: ${error.message}`);
            }
        });
        this.getLandlordPropsTenantComplaints = (tenantUserId, propertyId, landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.complaint.findMany({
                where: {
                    isDeleted: false,
                    propertyId,
                    property: {
                        landlordId
                    },
                    createdById: tenantUserId
                },
                include: { createdBy: true, property: true },
            });
        });
        this.getAllLandlordComplaints = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.complaint.findMany({
                    where: {
                        isDeleted: false,
                        property: {
                            landlordId,
                        },
                    },
                    include: { createdBy: true, property: true },
                });
            }
            catch (error) {
                throw new Error(`Failed to fetch landlord complaints: ${error.message}`);
            }
        });
        this.getAllPropertyComplaints = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.complaint.findMany({
                    where: { isDeleted: false, propertyId },
                    include: { createdBy: true, property: true },
                });
            }
            catch (error) {
                throw new Error(`Failed to fetch property complaints: ${error.message}`);
            }
        });
        this.getComplaintById = (id) => __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.complaint.findUnique({
                    where: { id },
                    include: { createdBy: true, property: true },
                });
            }
            catch (error) {
                throw new Error(`Failed to fetch complaint by ID: ${error.message}`);
            }
        });
        this.updateComplaint = (id, data) => __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.complaint.update({
                    where: { id },
                    data,
                });
            }
            catch (error) {
                throw new Error(`Failed to update complaint: ${error.message}`);
            }
        });
        this.deleteComplaint = (id) => __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.complaint.update({
                    where: { id },
                    data: { isDeleted: true },
                });
            }
            catch (error) {
                throw new Error(`Failed to delete complaint: ${error.message}`);
            }
        });
    }
}
exports.default = new ComplaintServices();
