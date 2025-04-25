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
const helpers_1 = require("../../utils/helpers");
class SupportTenantService {
    constructor() {
        this.profileSelect = {
            select: {
                id: true,
                fullname: true,
                profileUrl: true,
            }
        };
        this.userSelect = {
            select: {
                id: true,
                role: true,
                profile: this.profileSelect,
            }
        };
        this.tenantSelect = {
            select: {
                id: true,
                tenantId: true,
                landlordId: true,
                user: this.userSelect,
                include: {
                    landlord: true,
                    property: true,
                }
            }
        };
    }
    createSupportTenantTicket(data, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const tenant = yield __1.prismaClient.tenants.findUnique({
                where: { id: tenantId }
            });
            if (!tenant) {
                throw new Error('Tenant not found');
            }
            let ticketData = Object.assign(Object.assign({}, data), { supportTicketNumber: (0, helpers_1.generateIDs)('ASH-TNT'), status: data.status || 'open' });
            if (data.assignedTo === 'landlord') {
                const landlordTicket = yield __1.prismaClient.landlordSupportTicket.create({
                    data: Object.assign(Object.assign({}, ticketData), { landlordId: tenant.landlordId })
                });
                // TODO: alert the landlord
                return { type: 'landlord', ticket: landlordTicket };
            }
            else {
                // TODO: Create for the support users ticket data
            }
            // create the tenant ticket data
            const tenantTicket = yield __1.prismaClient.tenantSupportTicket.create({
                data: Object.assign(Object.assign({}, ticketData), { tenantId })
            });
            return { type: 'tenant', ticket: tenantTicket };
        });
    }
    generateIDs() {
        throw new Error("Method not implemented.");
    }
    getSupportTenantTicket(ticketId, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.tenantSupportTicket.findUnique({
                where: { id: ticketId, tenantId },
                include: {
                    tenant: this.tenantSelect
                }
            });
        });
    }
    updateSupportTenantTicket(data, tenantId, ticketId) {
        return __awaiter(this, void 0, void 0, function* () {
            const tenant = yield __1.prismaClient.tenants.findUnique(Object.assign({ where: { id: tenantId } }, this.tenantSelect));
            if (!tenant) {
                throw new Error('Tenant not found');
            }
            let ticketData = Object.assign(Object.assign({}, data), { status: data.status || 'open' });
            if (!ticketId) {
                ticketData.supportTicketNumber = (0, helpers_1.generateIDs)('ASH-TNT');
            }
            // Create or update the tenant ticket
            let tenantTicket;
            if (ticketId) {
                tenantTicket = yield __1.prismaClient.tenantSupportTicket.update({
                    where: { id: ticketId },
                    data: ticketData,
                });
            }
            else {
                tenantTicket = yield __1.prismaClient.tenantSupportTicket.create({
                    data: Object.assign(Object.assign({}, ticketData), { tenantId }),
                });
            }
            let assignedTicket = null;
            let notificationRecipient = null;
            if (data.assignedTo === 'landlord') {
                if (ticketId) {
                    assignedTicket = yield __1.prismaClient.landlordSupportTicket.update({
                        where: { id: ticketId },
                        data: ticketData,
                    });
                }
                else {
                    assignedTicket = yield __1.prismaClient.landlordSupportTicket.create({
                        data: Object.assign(Object.assign({}, ticketData), { landlordId: tenant.landlordId }),
                    });
                }
                notificationRecipient = tenant.landlordId;
            }
            else if (data.assignedTo === 'support') {
                // TODO: implement Support User DB
                // if (ticketId) {
                //     assignedTicket = await prismaClient.asherSupportTicket.update({
                //         where: { id: ticketId },
                //         data: ticketData,
                //     });
                // } else {
                //     assignedTicket = await prismaClient.asherSupportTicket.create({
                //         data: {
                //             ...ticketData,
                //             supportUserId: await this.getAvailableSupportUserId(),
                //         },
                //     });
                // }
                // notificationRecipient = await this.getSupportUser(assignedTicket.supportUserId);
            }
            // TODO: Create notification
            // if (notificationRecipient) {
            //     await this.createNotification({
            //         userId: notificationRecipient.id,
            //         message: `${ticketId ? 'Updated' : 'New'} support ticket: ${ticketData.subject}`,
            //         type: 'support_ticket',
            //         relatedId: tenantTicket.id,
            //     });
            // }
            return {
                tenantTicket,
                assignedTicket,
                type: data.assignedTo || 'tenant',
            };
        });
    }
    // Helper methods
    getAvailableSupportUserId() {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: to get an available support user
        });
    }
    getSupportUser(supportUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: to get support user details
        });
    }
    createNotification(notificationData) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: to create a notification
        });
    }
}
exports.default = new SupportTenantService();
