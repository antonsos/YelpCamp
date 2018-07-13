const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Campground = require('./models/campground');
const Comment = require("./models/comment");
const User = require("./models/user");
const seedDB = require('./seeds');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local');

seedDB();

//MDB config
const db = require('./config/keys').MongoURL;

//MongoDB connect
mongoose.connect(db)
  .then( () => (
    console.log('ok')
  ))
  .catch( err => console.log(err));

let port = process.env.PORT || 5000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(path.join(__dirname, '/public')));

//CONFIG PASSPORT
app.use(require('express-session')({
  secret: 'supersecret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use( (req, res, next) => {
  res.locals.currentUser = req.user
  next();
})

//Req and res
app.get('/', (req, res) => {
  res.render('landing');
});

app.get('/campgrounds', (req, res) => {
  Campground.find({}, (err, campgrounds) => {
      if(err) return console.log(err)
      res.render('campgrounds/index', {campgrounds});
  })
});

app.post('/campgrounds', (req, res) => {
  Campground.create(req.body.newCamp, (err, newCamp) => {
    if(err) return console.log(err);

    res.redirect('/campgrounds');
  });
});

app.get('/campgrounds/new', (req, res) => {
  res.render('campgrounds/new');
});

app.get('/campgrounds/:id', (req, res) => {
  Campground.findById(req.params.id).populate('comments').exec( (err, campground) => {
    if(err) return console.log(err);

    res.render('campgrounds/show', { campground });
  })
})

//============
//CAMPGROUNDS
//============

app.get('/campgrounds/:id/comments/new', isLoggedIn, (req, res) => {
  Campground.findById(req.params.id).populate('comments').exec( (err, campground) => {
    if(err) return console.log(err);

    res.render('comments/new', { campground });
  })
});

app.post('/campgrounds/:id/comments', (req, res) => {
  Campground.findById(req.params.id, (err, campground) => {
    if(err) return console.log(err);

    Comment.create(req.body.comment, (err, comment) => {
      if(err) return console.log(err)

      campground.comments.push(comment);
      campground.save();
    
      res.redirect(`/campgrounds/${campground._id}`);
    })
  })
});

//============
//AUTH
//============
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  let newUser = new User({username: req.body.username});
  User.register(newUser, req.body.password, (err, user) => {
    if(err) {
      console.log(err);
      return res.render('register');
    }

    passport.authenticate('local')(req, res, () => {
      res.redirect('/campgrounds')
    })
  })
})

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login',passport.authenticate('local',
  {
    successRedirect: 'campgrounds',
    failureRedirect: 'login'
  }
), (req, res) => {
  
})

app.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/campgrounds');
});

function isLoggedIn(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.listen(port, () => {
  console.log(`YelpCamp has started! ${port}`);
});