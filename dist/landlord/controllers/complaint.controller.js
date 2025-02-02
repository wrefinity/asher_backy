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
const complaintServices_1 = __importDefault(require("../../services/complaintServices"));
const complaint_schema_1 = require("../../validations/schemas/complaint.schema");
class ComplaintController {
    constructor() {
        this.getAllComplaints = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const landlordsId = String(req.user.landlords.id);
                const complaints = yield complaintServices_1.default.getAllLandlordComplaints(landlordsId);
                res.status(200).json(complaints);
            }
            catch (error) {
                res.status(500).json({ message: "Error fetching complaints" });
            }
        });
        this.updateComplaint = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { error, value } = complaint_schema_1.updateComplaintSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ message: error.details[0].message });
                const complaint = yield complaintServices_1.default.getComplaintById(id);
                if (!complaint)
                    return res.status(404).json({ message: "Complaint not found" });
                const updatedComplaint = yield complaintServices_1.default.updateComplaint(id, value);
                res.status(200).json({ updatedComplaint });
            }
            catch (error) {
                res.status(500).json({ message: "Error updating complaint" });
            }
        });
    }
}
exports.default = new ComplaintController();
