const express = require('express');
const app = express();

const mongoose = require('./DB/mongoose');

const bodyParser = require('body-parser');

//**Middleware */

//Load in the mongoose models
const { list, task, User } = require('./DB/Models/index');

const jwt = require('jsonwebtoken');

//Load middleware
app.use(bodyParser.json());

//CORS headers middleware
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS, DELETE, PATCH, HEAD");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, x-access-token, x-refresh-token, _id, Content-Type, Accept");
    
    res.header(
        'Access-Control-Expose-Headers',
        'x-access-token, x-refresh-token'
    );

    next(); 
  });

//check whether the request has a valid JWT access token
let authenticate = function(req, res, next){
    let token  = req.header('x-access-token');
    //verify JWT

    jwt.verify(token, User.getJWTSecret(), (err, decoded)=>{
        if(err){
            //there was an error
            //the jwt is invalid (do not authenticate)
            res.status(401).send(err);
        }else{
            //jwt is valid
            req.user_id = decoded._id
            next();
        }
    } )
}



//verify refresh token middleware (which will be verifing the session)
let verifySession = (req, res, next)=>{
    //grab the refresh token from the request  header
    let refreshToken = req.header('x-refresh-token');

    //grab the _id from the request header
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user)=>{
        if(!user){
            //user couldn't be found 
            return Promise.reject({
                "error": "User not found. Make sur that the refresh token and user id are correct"
            });
        }else{
            //if the user was found 
            //therefore the refresh token exists in the database - but we still have to check if it has expired or not
            req.user_id = user._id;
            req.userObject = user;
            req.refreshToken = refreshToken;

            let isSessionValid = false;

            user.sessions.forEach((session)=>{
                if (session.token===refreshToken){
                    //check if the session has expired
                    if(User.hasRefreshTokenExpired(session.expiresAt) === false){
                        //refresh token has not expired
                        isSessionValid = true;
                    }
                }
            });
            if(isSessionValid){
                //the session is valid - call next() to continue processing this web request
                next();
            }else{
                // the session is invalid
                return Promise.reject({
                    "error": "Refresh token has expired or the session is invalid"
                })
            }

        }
        
    }).catch((e)=>{
        res.status(401).send(e);
    })
}


//**Route Handlers

//List Routes

/* GET/lists
 To get all lists
*/
app.get('/lists', authenticate, function(req, res){
/*We want to return an array of all the lists belong to the authenticated user
*/
    list.find({
        _userId: req.user_id
    }).then(lists =>{
        res.send(lists);
    }).catch((e)=>{
        res.send(e);
    });
});


/* POST/lists
To create a new list and return the new list back to the user(which include the id)
the list information (fields) will be passed in via the JSON request body 
*/
app.post('/lists', authenticate, function(req, res){
    let title = req.body.title;

    let newList = new list({
        title: title,
        _userId: req.user_id
    });
    newList.save().then(listDoc => {
        //the full list document is returned
        res.send(listDoc);
    })
});

/* PATH /lists/:id
 To update a specified list
*/
app.patch('/lists/:id', authenticate, function(req, res){
/*To update the specified list with new values
 */
    list.findOneAndUpdate({_id: req.params.id, _userId: req.user_id}, {
        $set: req.body
    }).then(()=>{
        res.send({'message': 'updated successfully'});
    });
});

app.delete('/lists/:id', authenticate, function(req, res){
/*To delete the specified list
 */
    list.findOneAndRemove({
        _id: req.params.id,
        _userId: req.user_id
    }).then((removedListDoc)=>{
        res.send(removedListDoc);
        //delete all the tasks in this deleted list
        deleteTasksFromList(removedListDoc._id)
    });
});

//Task Routes

app.get('/lists/:listId/tasks', authenticate, function(req, res){
    //return all tasks that belong to a specific list
    task.find({
        _listId : req.params.listId
    }).then((tasks)=>{
        res.send(tasks);
    });
}); 

app.post('/lists/:listId/tasks', authenticate, function(req, res){
    //create a new task specified by listId

    list.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((myList)=>{
        if(myList){
            //list object with the specified condition was found
            //therefore the currently authenticated user can create new tasks
            return true;
        }
        //the list object is undefined
        return false;
    }).then((canCreateTask)=>{
        if(canCreateTask){
            let newTask = new task({
                title: req.body.title,
                _listId: req.params.listId
            });
          
            newTask.save().then((newTaskDoc) =>{
                res.send(newTaskDoc);
            });
        }else{
            res.sendStatus(404);
        }
    })

    
});

app.patch('/lists/:listId/tasks/:taskId', authenticate, function(req, res){
    //update a task specified by listId
    list.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((myList)=>{
        if(myList){
            //list object with the specified condition was found
            //therefore the currently authenticated user can update the specified task withing this list
            return true;
        }
        //the list object is undefined
        return false;
    }).then((canUpdateTask)=>{
        if(canUpdateTask){
            task.findOneAndUpdate({
                _id: req.params.taskId,
                _listId: req.params.listId
            }, {
                $set: req.body
            }).then(()=>{
                res.send({message: 'updated successfully'});
            });
        }else{
            res.sendStatus(404);
        }
    })
    
});

app.delete('/lists/:listId/tasks/:taskId', authenticate, function(req, res){
    //delete a task specified by listId
    list.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((myList)=>{
        if(myList){
            //list object with the specified condition was found
            //therefore the currently authenticated user can update the specified task withing this list
            return true;
        }
        //the list object is undefined
        return false;
    }).then((canDeleteTask)=>{
        if(canDeleteTask){
            task.findOneAndRemove({
                _id: req.params.taskId,
                _listId: req.params.listId
            }).then((removedTaskDoc)=>{
                res.send(removedTaskDoc);
            });
        }else{
            res.sendStatus(404);
        }
    });
});

//Task Routes

app.post('/users',function(req, res){
    //user sign up
    let body = req.body;
    let newUser = new User(body)
    newUser.save().then(() =>{
        return newUser.createSession();
    }).then((refreshToken)=>{
        //session created sucessfully => refreshToken returned
        //now we generate the access token for the token
        return newUser.generateAccessAuthToken().then((accessToken)=>{
            //access token generated successfully, now we gonna return an object containing the auth token
            return {accessToken, refreshToken}
        })
    }).then((authTokens)=>{
        //now we construct and send the response to the user with thier auth tokens in the header 
        //and the user object in the body 
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e)=>{
        res.status(400).send(e);
    })
})

app.post('/users/login', function(req, res){
    //login
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user)=>{
        return user.createSession().then((refreshToken)=>{
            //session created sucessfully => refreshToken returned
            //now we generate the access token for the token
            return user.generateAccessAuthToken().then((accessToken)=>{
                //access token generated successfully, now we gonna return an object containing the auth token
                return {accessToken, refreshToken}
            })
        }).then((authTokens)=>{
            //now we construct and send the response to the user with thier auth tokens in the header 
            //and the user object in the body 
            res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(user);
        })
    }).catch((e)=>{
        res.status(400).send(e);
    })

})

app.get('/users/me/access-token', verifySession, function(req, res){
    //generate and return an access token
    //we know that the user/caller is authentificated and we have the user_id and userObject available to us
    req.userObject.generateAccessAuthToken().then((accessToken)=>{
        res.header('x-access-token', accessToken).send({accessToken});
    }).catch((e)=>{
        res.status(400).send(e);
    })
    

})

//HELPER Methods

let deleteTasksFromList = function(_listId){
    task.deleteMany({
        _listId
    }).then(()=>{
        console.log("Tasks from "+ _listId +" were deleted!")
    })
}

app.listen(3000, function(){
    console.log('Server is listening on port 3000');
}); 