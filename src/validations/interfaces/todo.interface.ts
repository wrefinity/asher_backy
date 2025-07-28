import {PriorityLevel, TodoStatus } from "@prisma/client"

export interface ITodoQuery {
  page?: number;
  limit?: number;
  status?: TodoStatus;
  priority?: PriorityLevel;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
}

export interface ITodo {
  id?: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: PriorityLevel;
  status?: TodoStatus;
  userId: string;
}

export interface ITodoUpdate {
  title?: string;
  description?: string;
  dueDate?: Date;
  priority?: PriorityLevel;
  status?: TodoStatus;
}