import { Injectable } from '@angular/core';
import { Task } from './models/task.model';
import { WebRequestService } from './web-request.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private webReqService: WebRequestService) { }

  getLists(){
    return this.webReqService.get('lists');
  }

  createList(title: string){
    //send a web request to create a new list
    return this.webReqService.post('lists', { title });  
  }
  updateList(listId: string, title: string){
    //send a web request to update a list
    return this.webReqService.patch(`lists/${listId}`, { title });  
  }

  updateTask(listId: string, taskId: string, title: string){
    //send a web request to update a task
    return this.webReqService.patch(`lists/${listId}/tasks/${taskId}`, { title });  
  }

  deleteList(listId: string){
    return this.webReqService.delete(`lists/${listId}`);
  }

  deleteTask(listId: string, taskId: string){
    return this.webReqService.delete(`lists/${listId}/tasks/${taskId}`);
  }
  
  getTasks(listId: string){
    return this.webReqService.get(`lists/${listId}/tasks`);
  }

  createTask(title: string, listId: string){
    //send a web request to create a new task
    return this.webReqService.post(`lists/${listId}/tasks`, { title });  
  }
  
  complete(task: Task){
    return this.webReqService.patch(`lists/${task._listId}/tasks/${task._id}`, {
      completed : !task.completed
    });
  }


}
