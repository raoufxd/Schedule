// this file will handle connection logic to the mongoDB Database

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/TaskManager', {useNewUrlParser: true}).then(function(){
    console.log('connected to MongoDb successfully');
}).catch((e) =>{
    console.log('Error while attemting to connect to MongoDB');
    console.log(e);
});

module.exports = {
    mongoose
};
