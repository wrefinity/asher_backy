import { IPropertyDocument } from '../validations/interfaces/properties.interface';
import { prismaClient } from "..";
import { Prisma } from '@prisma/client';

export class PropertyDocumentService {
  
  create = async (data: Prisma.propertyDocumentCreateInput) =>{
    return prismaClient.propertyDocument.create({ data });
  }

  findAll = async () =>{
    return prismaClient.propertyDocument.findMany();
  }

  findById = async (id: string)=>{
    return prismaClient.propertyDocument.findUnique({ where: { id } });
  }

  update = async (id: string, data: Partial<Prisma.propertyDocumentUpdateInput>) =>{
    return prismaClient.propertyDocument.update({
      where: { id },
      data,
    });
  }

  delete = async (id: string)=>{
    return prismaClient.propertyDocument.delete({ where: { id } });
  }
}
