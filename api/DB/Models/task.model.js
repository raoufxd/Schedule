const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: 1,
        trim:true
    },
    _listId: {
        type: mongoose.Types.ObjectId,
        require: true
    },
    completed: {
        type: Boolean,
        default: false
    }

});

const task = mongoose.model('Task', taskSchema);

module.exports = {task};