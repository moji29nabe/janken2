
var TwitterStrategy, app, base, cookie, express, expressSession, expressSessionStore, http, io, parser, passport, passportConfig, server, socketio;

if ((base = process.env).PORT == null) {
  base.PORT = 59798;
}

// dependencies

express = require('express');
expressSession = require('express-session');
expressSessionStore = new expressSession.MemoryStore;

passport = require('passport');
passportConfig = {
  twitter: {
    consumerKey: process.env.TWITTER_KEY,
    consumerSecret: process.env.TWITTER_SECRET,
    callbackURL: "http://localhost:" + process.env.PORT + "/callback"
  }
};
TwitterStrategy = require('passport-twitter').Strategy;

http = require('http');
socketio = require('socket.io');
cookie = require('cookie-parser/node_modules/cookie');
parser = require('cookie-parser');

// passport setup

passport.serializeUser(function(user, done) {
  return done(null, user);
});
passport.deserializeUser(function(obj, done) {
  return done(null, obj);
});
passport.use(new TwitterStrategy(passportConfig.twitter, function(token, tokenSecret, profile, done) {
  return process.nextTick(function() {
    return done(null, profile);
  });
}));

// express setup

app = express();
app.use(expressSession({
  store: expressSessionStore,
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.get('/', function(req, res) {
  var html, ref;
  html = "<script src=\"/socket.io/socket.io.js\"></script>\n<script>io.connect().on('authorized',function(session){document.querySelector('pre').innerHTML=session})</script>\n<h1>Passport for Socket.io1.3</h1>\n<pre></pre>";
  if (((ref = req.session.passport) != null ? ref.user : void 0) == null) {
    html += '<a href="/auth">twitterOauth</a>';
  }
  return res.end(html);
});

app.get('/auth', passport.authenticate('twitter'));
app.get('/callback', passport.authenticate('twitter', {
  successRedirect: '/',
  failureRedirect: '/failure'
}));
app.get('/failure', function(req, res) {
  return res.end('だめでした');
});

// socket.io and http-server setup

server = http.Server(app);
server.listen(process.env.PORT);
io = socketio(server);
io.use(function(client, next) {
  var cookies, sid, signedCookies;
  signedCookies = cookie.parse(client.request.headers.cookie);
  cookies = parser.signedCookies(signedCookies, 'keyboard cat');
  sid = cookies['connect.sid'];
  return expressSessionStore.get(sid, function(error, session) {
    if (error != null) {
      return next(error);
    }
console.log(session)
    if (session && session.passport.user == null) {
      return next('Guest');
    }
    client.session = session;
    return next();
  });
});
io.on('connect', function(client) {
  return client.emit('authorized', JSON.stringify(client.session, null, 2));
});
