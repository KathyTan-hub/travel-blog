//import dependicies
var express = require('express');
var path = require('path');
const {check, validationResult} = require('express-validator');
//const {RSA_PSS_SALTLEN_DIGEST, O_DIRECTORY} = require('constants');

//setup the DB connection
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/travelblog', {
    useNewUrlParser : true,
    useUnifiedTopology : true
});

//setup the model for the collection - blogs.
const Blog = mongoose.model('Blog', {
    blogTitle : String,
    image : String,
    description : String
});

//Setup the model for the admin
const Admin = mongoose.model('Admin', {
    username : String,
    password : String
});

//get express-session
const session = require("express-session");

var myApp = express();
myApp.use(express.urlencoded({extended:true}));

//setup session
myApp.use(session({
    secret : "superrandomsecret",
    resave : false,
    saveUninitialized : true
}));

//set path to the public folders and views folders
myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname + '/public'));

myApp.set('view engine', 'ejs');

//set up different routes (pages)
//home page
myApp.get('/', function(req, res){
    var blog;
    Blog.find({}).exec(function(err, blogs){
        blog = blogs[0];
        res.render('index', {blogs : blogs, blog : blog});
    });
});

//home Page with specific id
myApp.get('/details/:id',function(req, res){
        var id = req.params.id;
        Blog.find({}).exec(function(err, blogs){
            Blog.findById({_id : id}).exec(function(err, blog){
                res.render('index', {blogs : blogs , blog : blog});
            });
        });
});


//All posts page
myApp.get('/allposts', function(req, res){
    if(req.session.userLoggedIn){
        Blog.find({}).exec(function(err, blogs){
            res.render('allposts', {blogs : blogs});
        });
    }
    else{
        res.redirect('/login');
    }
});

//Login Page
myApp.get('/login', function(req, res){
    Blog.find({}).exec(function(err, blogs){
        res.render('login', {blogs : blogs});
    });
});

//Login Post Method
myApp.post('/login', function(req, res){
    var user = req.body.username;
    var pass = req.body.password;
    console.log("I am in the login post");
    console.log(user);
    console.log(pass);
    Admin.findOne({username : user, password : pass}).exec(function(err, admin){
        if(admin){
            //Store username in session and set login in true
            req.session.username = admin.username;
            req.session.userLoggedIn = true;
            //Redirect user to the dashboard - allposts page
            res.redirect('/allposts');
        }
        else{
            //Display error if user info is incorrect
            Blog.find({}).exec(function(err, blogs){
                res.render('login', {error : 'Sorry Login Failed!', blogs : blogs});
            });
        }
    });
});

//Logout Page
myApp.get('/logout',function(req, res){
    req.session.username = '';
    req.session.userLoggedIn = false;
    Blog.find({}).exec(function(err, blogs){
        res.render('login', {error : 'Successfully logged out!', blogs : blogs});
    });
});

//New Blog page
myApp.get('/new', function(req, res)
{
    Blog.find({}).exec(function(err, blogs){
        res.render('new', {blogs : blogs});
    });
});

//New Post Method
myApp.post('/new', [
    check('blogTitle', 'Name is required!').notEmpty(),
    check('image', 'Image is required!').notEmpty(),
    check('description', 'Description is required!').notEmpty()
], function(req, res)
{
    const errors = validationResult(req);

    if(!errors.isEmpty())
    {
        res.render('new', {
            errors : errors.array()
        });
    }
    else
    {
        var blogTitle = req.body.blogTitle;
        var image = req.body.image;
        var description = req.body.description;

        var blogData = {
            blogTitle : blogTitle,
            image : image,
            description : description
        }

        //create an object for the model Blog:
        var myBlog = new Blog(blogData);

        //save the Blog
        myBlog.save();

        //Display Output: Add new post successfully
        Blog.find({}).exec(function(err, blogs){
            res.render('editsuccess',{
                blogs : blogs, 
                blogTitle : blogTitle,
                image : image,
                description : description,
                message : "New Post Added Successfully!"
            });
        });
    }
});

//Delete Page
myApp.get('/delete/:id',function(req, res){
    //Check if user session is created
    if(req.session.username){
        //Delete
        var id = req.params.id;
        Blog.findByIdAndDelete({_id : id}).exec(function(err, blog){
            if(blog){
                Blog.find({}).exec(function(err, blogs){
                    res.render('delete', {message : "Successfully Deleted...!", blogs : blogs});
                });
            }
            else{
                Blog.find({}).exec(function(err, blogs){
                    res.render('delete', {message : "Sorry, post not deleted...!", blogs : blogs});
                });
            }
        });
    }
    else{
        res.redirect('/login');  //Otherwise redirect user to login page.
    }
});

//Edit Page
myApp.get('/edit/:id',function(req, res){
    //Check if user session is created
    if(req.session.username){
        //Edit
        var id = req.params.id;
        var blogTitle, image, description;
        Blog.findOne({_id : id}).exec(function(err, blog){
            if(blog){
                blogTitle = blog.blogTitle;
                image = blog.image;
                description = blog.description;
                Blog.find({}).exec(function(err, blogs){
                    res.render('edit', {
                        blogs : blogs, 
                        blogTitle : blogTitle,
                        image : image,
                        description : description});
                });
            }
            else{
                res.send('No order found with this id...!');
            }
        });
    }
    else{
        res.redirect('/login');  //Otherwise redirect user to login page.
    }
});

//Edit Post Method
myApp.post('/edit/:id', [
    check('blogTitle', 'Name is required!').notEmpty(),
    check('image', 'Image is required!').notEmpty(),
    check('description', 'Description is required!').notEmpty()
], function(req, res)
{
    const errors = validationResult(req);

    if(!errors.isEmpty())
    {
        var id = req.params.id;
        Blog.findOne({_id : id}).exec(function(err, blog){
            if(blog){
                blogTitle = blog.blogTitle;
                image = blog.image;
                description = description;
                Blog.find({}).exec(function(err, blogs){
                    res.render('edit',{
                        blogs : blogs,
                        blogTitle : blog.blogTitle,
                        image : blog.image,
                        description : description,
                        errors : errors.array()});
                });
            }
            else{
                res.send('No order found with this id...!');
            }
        });
    }
    else
    {
        //No Errors:
        var blogTitle = req.body.blogTitle;
        var image = req.body.image;
        var description = req.body.description;

        var id = req.params.id;
        Blog.findOne({_id : id}).exec(function(err, blog){
            blog.blogTitle = blogTitle;
            blog.image = image;
            blog.description = description;
            blog.save();
            //Display Output: Updated Information
            Blog.find({}).exec(function(err, blogs){
                res.render('editsuccess',{
                    blogs : blogs, 
                    blogTitle : blogTitle,
                    image : image,
                    description : description,
                    message : "Post Updated Successfully!"
                });
            });
        });
    }
});

//start server and listen to port
myApp.listen(8080); // open URL in Browser: http://localhost:8080

//confirmation output
console.log('Execution complete...website opened at port 8080!');