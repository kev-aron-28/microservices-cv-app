const LocalStategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();


function initializePassport(passport) {
  
  const authenticateUser = async (email, password, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });
  
      if(!user) {
        return done(null, false, { message: 'User not found' });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
  
      if(isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Password incorrect' });
      }
    } catch (error) {
      return done(error);
    }
  }

  passport.use(new LocalStategy({ usernameField: 'email' }, authenticateUser));

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });
      done(null, user);
    } catch (error) {
      done(err);
    }
  });

}

module.exports = initializePassport;
