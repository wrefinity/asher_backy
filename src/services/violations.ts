import { prismaClient } from "..";
import { SeverityLevel } from "@prisma/client";


export interface ViolationIF{
  description: string;       // Description of the violation (required)
  severityLevel?: SeverityLevel; // Severity of the violation (optional, defaults to MODERATE)
  actionTaken?: string;      // Action taken (optional)
  tenantId: string;    
  propertyId?: string;   
  createdById: string;
}


class ViolationService {
  getTenantViolation =  async (landlordUserId: string)=>{
    return await prismaClient.violation.findMany({
      where:{
        createdById: landlordUserId,
        isDeleted:false
      }
    });
  }

  getViolationById = async (id: string)=>{
    return await prismaClient.violation.findUnique({ where: { id } });
  }
  getViolationTenantId = async (tenantId: string) =>{
    return await prismaClient.violation.findMany({ 
      where: { tenantId } 
    });
  }

  create = async (data: ViolationIF) => {
    return await prismaClient.violation.create({
      data: {
        description: data.description,
        severityLevel: data.severityLevel || SeverityLevel.LOW,  
        actionTaken: data.actionTaken,
        tenantId: data.tenantId,
        propertyId: data.propertyId,
      },
    });
  }


  public async deleteViolation(id: string){
    return await prismaClient.violation.update({ 
        where: { id },
        data: {isDeleted:true},
    });
  }
}

export default new ViolationService();