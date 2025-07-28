import { createTodoSchema, getTodosSchema, updateTodoSchema} from "../validations/schemas/todos.schema";
import TodoService from "../services/todos.service";
import ErrorService from "../services/error.service";
import { Request, Response } from "express";
import { CustomRequest } from "../utils/types";


class TodoController {

  createTodo =  async (req: CustomRequest, res: Response) =>{
    try {
      const { error, value } = createTodoSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map((d) => d.message),
        });
      }

      const todo = await TodoService.createTodo({
        ...value,
        userId: req.user.id,
      });
      res.status(201).json(todo);
    } catch (error) {
       ErrorService.handleError(error, res);
    }
  }

  getTodo = async (req: CustomRequest, res: Response) =>{
    try {
      const todo = await TodoService.getTodoById(req.params.id, req.user.id);
      if (!todo) {
        return res.status(404).json({ error: 'Todo not found' });
      }
      res.json(todo);
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  }

  getUserTodos = async (req: CustomRequest, res: Response) =>{
    console.log(`========${req.query}=============`) 
    console.log(req.query)

    try {
      const { error, value } = getTodosSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map((d) => d.message),
        });
      }

      const result = await TodoService.getUserTodos(req.user.id, value);
      res.json(result);
    } catch (error) {
        console.log(error)
      res.status(500).json({ error: 'Failed to fetch todos' });
    }
  }

  updateTodo =  async (req: CustomRequest, res: Response) =>{
    try {
      const { error, value } = updateTodoSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map((d) => d.message),
        });
      }

      const updatedTodo = await TodoService.updateTodo(
        req.params.id,
        req.user.id,
        value
      );
      res.json(updatedTodo);
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Todo not found' });
      }
      res.status(500).json({ error: 'Failed to update todo' });
    }
  }

  deleteTodo = async (req: CustomRequest, res: Response) =>{
    try {
      await TodoService.deleteTodo(req.params.id, req.user.id);
      res.status(200).json({message:"todo deleted successfully"});
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Todo not found' });
      }
      res.status(500).json({ error: 'Failed to delete todo' });
    }
  }
}

export default new TodoController()