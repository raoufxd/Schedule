import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { TaskService } from 'src/app/task.service';

@Component({
  selector: 'app-edit-list',
  templateUrl: './edit-list.component.html',
  styleUrls: ['./edit-list.component.scss']
})
export class EditListComponent implements OnInit {

  constructor(private taskService: TaskService, private router: Router, private route: ActivatedRoute) { }

  listId: string;

  ngOnInit(): void {
    this.route.params.subscribe(
      (params: Params)=>{
          this.listId = params.listId; 
      }
    )
  }

  updateList(title: string){
    this.taskService.updateList(this.listId, title).subscribe(()=>{
      //now we navigate to /lists/list._id
      this.router.navigate(['/lists', this.listId]);
    });
  }

}
