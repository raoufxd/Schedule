const mongoose = require('mongoose');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { resolve } = require('path');
const { reject } = require('lodash');

//JWT Secret
const jwtSecret = '68462762149493762996fzdsfsdfkqfjqf6989041252';

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    sessions: [{
        token: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Number,
            required: true
        }
    }]
});

//**Instanace methods

UserSchema.methods.toJSON = function(){
    const user = this;
    const userObject = user.toObject();

    //return the document except the password and the sessions
    return _.omit(userObject, ['password', 'sessions']);
}

UserSchema.methods.generateAccessAuthToken = function(){
    const user = this;
    return new Promise((resolve, reject)=>{
        //create and return  the JWT(JSON Web Token)
        jwt.sign({_id: user._id.toHexString()}, jwtSecret, {expiresIn: "15m"}, (err, token)=>{
            if(!err){
                resolve(token);
            }
            else{
                reject();
            }
        });
    });
}

UserSchema.methods.generateRefreshAuthToken = function(){
    return new Promise((resolve, reject)=>{
        crypto.randomBytes(64, (err, buf)=>{
            if(!err){
                let token = buf.toString('hex');
                return resolve(token);
            }
        })
    })
}

UserSchema.methods.createSession = function(){
    let user = this;
    return user.generateRefreshAuthToken().then((refreshToken)=>{
        return saveSessionToDatabase(user, refreshToken);
    }).then((refreshToken)=>{
        //saved to DB
        return refreshToken;
    }).catch((e)=>{
        return Promise.reject('Failed to save session to database.\n'+ e);
    })
}


//**Model methods (static methods)

UserSchema.statics.getJWTSecret = function(){
    return jwtSecret;
}

UserSchema.statics.findByIdAndToken = function(_id, token){
    //finds user by id and token
    //used in auth middleware( verigy session)
    const user = this;

    return user.findOne({
        _id,
        'sessions.token': token
    });
}

UserSchema.statics.findByCredentials = function(email, password){
    let User = this;

    return User.findOne({email}).then((user)=>{
        if(!user){
            return Promise.reject();
        }
        else{
            return new Promise((resolve, reject)=>{
                bcrypt.compare(password, user.password, (err, res)=>{
                    if(res){
                        resolve(user);
                    }else{
                        reject();
                    }
                })
            })
        }
    })
}

UserSchema.statics.hasRefreshTokenExpired = function(expiresAt){
    let secondsSinceEpoch = Date.now()/1000; //we devide by 1000 to get the seconds because it is in milliseconds

    if(expiresAt > secondsSinceEpoch){
        //hasn't expired
        return false;
    }else{
        //has expired
        return true;
    }
}


//**Middleware

//before a user document is saved, this code runs
UserSchema.pre('save', function(next){
    let user = this;
    let constFactor = 10;

    if(user.isModified('password')){
        //if the password has been changed/edited

        //generate salt and hash password
        bcrypt.genSalt(constFactor, (err, salt)=>{
            bcrypt.hash(user.password, salt, (err, hash)=>{
                user.password = hash;
                next();
            })
        })
    } else{
        next();
    }
})



//**Helper methods
let saveSessionToDatabase = (user, refreshToken) => {
    //save the session
    return new Promise((resolve, reject)=>{
        let expiresAt = generateRefreshTokenExpiryTime();

        user.sessions.push({'token': refreshToken, 'expiresAt': expiresAt})

        user.save().then(()=>{
            resolve(refreshToken);
        }).catch((e)=>{
            reject(e);
        })
    })
}

let generateRefreshTokenExpiryTime = function(){
    let daysUntilExpire = "10";
    let secondsUntilEpire = daysUntilExpire*24*60*60;
    return ((Date.now()/1000) + secondsUntilEpire);
}


const User = mongoose.model('User', UserSchema);

module.exports = { User };