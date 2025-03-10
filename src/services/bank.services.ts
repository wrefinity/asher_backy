import { prismaClient } from "..";
import { IBankInfo } from '../validations/interfaces/banks.interface';


export class BankInfoService {
    createBankInfo = async (data: IBankInfo) => {
    return await prismaClient.bankInfo.create({
      data,
    });
  }

  getBankInfoById = async (id: string) =>{
    return await prismaClient.bankInfo.findUnique({
      where: { id },
    });
  }

  updateBankInfo = async (id: string, data: IBankInfo) => {
    return await prismaClient.bankInfo.update({
      where: { id },
      data,
    });
  }

  deleteBankInfo = async (id: string) => {
    return await prismaClient.bankInfo.delete({
      where: { id },
    });
  }

  getAllBankInfo = async () => {
    return await prismaClient.bankInfo.findMany();
  }
}
