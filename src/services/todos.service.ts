import { prismaClient } from "..";
import { ITodo, ITodoQuery, ITodoUpdate } from "../validations/interfaces/todo.interface"
import { PriorityLevel, Prisma, TodoStatus } from "@prisma/client";

class TodosService {

    async createTodo(todoData: ITodo) {
        return prismaClient.todo.create({
            data: {
                title: todoData.title,
                description: todoData.description,
                dueDate: todoData.dueDate,
                priority: todoData.priority as PriorityLevel,
                status: todoData.status as TodoStatus,
                userId: todoData.userId,
            },
        });
    }

    async getTodoById(id: string, userId: string) {
        return prismaClient.todo.findUnique({
            where: { id, userId },
        });
    }

    async getUserTodos(userId: string, query: ITodoQuery) {
        const { page = 1, limit = 10, status, priority, fromDate, toDate, search } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.TodoWhereInput = { userId };

        // Add filters
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (fromDate || toDate) {
            where.dueDate = {};
            if (fromDate) where.dueDate.gte = fromDate;
            if (toDate) where.dueDate.lte = toDate;
        }

        const [total, todos] = await Promise.all([
            prismaClient.todo.count({ where }),
            prismaClient.todo.findMany({
                where,
                skip,
                take: limit,
                // Correct orderBy format - must be an array of objects
                orderBy: [
                    { priority: 'desc' },
                    { dueDate: 'asc' }
                ]
            })
        ]);

        return {
            data: todos,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total
            }
        }
    }
    async updateTodo(id: string, userId: string, updateData: ITodoUpdate) {
        return prismaClient.todo.update({
            where: { id, userId },
            data: {
                title: updateData.title,
                description: updateData.description,
                dueDate: updateData.dueDate,
                priority: updateData.priority as PriorityLevel,
                status: updateData.status as TodoStatus,
            },
        });
    }
    async getLandlordTodo(landlordId: string) {
        return prismaClient.todo.findMany({
            where: {
                users: {
                    landlords: { id: landlordId }
                }
            },
        })
    }

    async deleteTodo(id: string, userId: string) {
        return prismaClient.todo.delete({
            where: { id, userId },
        });
    }
}

export default new TodosService()