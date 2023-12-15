var express = require('express');
var router = express.Router();
const userModel = require('./users');
const postModel = require('./post');
const passport = require('passport');
const localStrategy = require('passport-local');
const upload = require('./multer');

passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function(req, res) {
  res.render('login', {footer: false});
});

router.get('/signup', function(req, res) {
  res.render('index', {footer: false});
});

router.get('/feed', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username: req.session.passport.user});
  const post = await postModel.find().populate("user");
  res.render('feed', {footer: true, posts:post, user:user});
});

router.get('/profile', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username: req.session.passport.user}).populate("posts")
  res.render('profile', {footer: true, user});
});

router.get('/search', isLoggedIn, function(req, res) {
  res.render('search', {footer: true});
});

router.get('/like/post/:id',isLoggedIn, async function(req, res){
  const user = await userModel.findOne({username: req.session.passport.user});
  const post = await postModel.findOne({_id: req.params.id});

  //If already like remove like
  // if not liked, like it
  if(post.like.indexOf(user._id) === -1){
    post.like.push(user._id);
  }
  else{
    post.like.splice(post.like.indexOf(user._id), 1);
  }

  await post.save();
  res.redirect("/feed");
});

router.get('/edit', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username: req.session.passport.user});
  res.render('edit', {footer: true, user: user});
});

router.get('/upload', isLoggedIn, function(req, res) {
  res.render('upload', {footer: true});
});

router.get('/username/:username', async function(req, res){
  const regex = new RegExp(`^${req.params.username}`, 'i');
  const users = await userModel.find({username:regex});
  res.json(users);
});

router.post('/register', function(req, res){
  const userData = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email
  });

  userModel.register(userData, req.body.password)
  .then(function(){
    passport.authenticate("local")(req, res, function(){
      res.redirect("/profile");
    })
  })
});

router.post('/login', passport.authenticate("local", {
  successRedirect: "/profile",
  failureRedirect: "/"
  }), function(req, res){

});

router.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

router.post("/update", upload.single("profile_image"), async function(req, res){
  const user = await userModel.findOneAndUpdate(
    {username: req.session.passport.user},
    {username: req.body.username, name: req.body.name, bio: req.body.bio},
    {new: true}
  );

  if(req.file){
    user.profileImage = req.file.filename;
  }
  await user.save();
  res.redirect('/profile');

});

router.post('/upload', isLoggedIn, upload.single("image"), async function(req, res){
  const user = await userModel.findOne({username: req.session.passport.user});
  const post = postModel.create({
    picture: req.file.filename,
    user: user._id,
    caption: req.body.caption
  });

  user.posts.push(post._id);
  await user.save();
  res.redirect('/feed');
});

function isLoggedIn(req, res, next){
  if(req.isAuthenticated()) return next();
  res.redirect("/");
}

module.exports = router;
