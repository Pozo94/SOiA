require('dotenv').config();
console.log('MONGODB_URI:', process.env.MONGODB_URI);
const express = require('express');
const path = require('path');
const session = require('express-session');
const {MongoStore} = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const helmet = require('helmet');

const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const addressRoutes = require('./routes/addresses');

const app = express();

connectDB();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(
    helmet({
      contentSecurityPolicy: false
    })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('trust proxy', 1);


app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI
        }),
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 8
        }
    })
);

app.use(flash());

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/addresses');
  }

  return res.redirect('/login');
});

app.use('/', authRoutes);
app.use('/addresses', addressRoutes);

module.exports = app;