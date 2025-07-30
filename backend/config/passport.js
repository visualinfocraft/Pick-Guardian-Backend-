const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

const User = require("../models/User");
require("dotenv").config();

// 🔹 Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google Profile:', profile); // Debug log
    
    // Check if user already exists with Google ID
    let user = await User.findOne({ where: { googleId: profile.id } });
    
    if (user) {
      console.log('Existing Google user found:', user.id);
      return done(null, user);
    }
    
    // Check if user exists with same email (link accounts)
    const email = profile.emails?.[0]?.value;
    if (email) {
      user = await User.findOne({ where: { email: email.toLowerCase() } });
      if (user) {
        // Link Google account to existing user with URL length handling
        const photoUrl = profile.photos?.[0]?.value;
        await user.update({
          googleId: profile.id,
          displayName: user.displayName || profile.displayName,
          photo: user.photo || (photoUrl && photoUrl.length > 255 ? photoUrl.substring(0, 255) : photoUrl),
          provider: user.provider === 'local' ? 'local,google' : user.provider + ',google'
        });
        console.log('Linked Google account to existing user:', user.id);
        return done(null, user);
      }
    }
    
    // Create new user with URL length handling
    const photoUrl = profile.photos?.[0]?.value;
    user = await User.create({
      googleId: profile.id,
      displayName: profile.displayName || 'Google User',
      email: email || null,
      photo: photoUrl && photoUrl.length > 255 ? photoUrl.substring(0, 255) : photoUrl,
      provider: 'google'
    });
    
    console.log('New Google user created:', user.id);
    return done(null, user);
    
  } catch (err) {
    console.error('Google Auth Error:', err);
    console.error('Error details:', err.original || err.message);
    return done(err, null);
  }
}));

// 🔹 Facebook OAuth Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,
  profileFields: ["id", "displayName", "photos", "email"]
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Facebook Profile:', profile); // Debug log
    
    // Check if user already exists with Facebook ID
    let user = await User.findOne({ where: { facebookId: profile.id } });
    
    if (user) {
      console.log('Existing Facebook user found:', user.id);
      return done(null, user);
    }
    
    // Check if user exists with same email (link accounts)
    const email = profile.emails?.[0]?.value;
    if (email) {
      user = await User.findOne({ where: { email: email.toLowerCase() } });
      if (user) {
        // Link Facebook account to existing user with URL length handling
        const photoUrl = profile.photos?.[0]?.value;
        await user.update({
          facebookId: profile.id,
          displayName: user.displayName || profile.displayName,
          photo: user.photo || (photoUrl && photoUrl.length > 255 ? photoUrl.substring(0, 255) : photoUrl),
          provider: user.provider === 'local' ? 'local,facebook' : user.provider + ',facebook'
        });
        console.log('Linked Facebook account to existing user:', user.id);
        return done(null, user);
      }
    }
    
    // Create new user with URL length handling
    const photoUrl = profile.photos?.[0]?.value;
    user = await User.create({
      facebookId: profile.id,
      displayName: profile.displayName || 'Facebook User',
      email: email || null,
      photo: photoUrl && photoUrl.length > 255 ? photoUrl.substring(0, 255) : photoUrl,
      provider: "facebook"
    });
    
    console.log('New Facebook user created:', user.id);
    return done(null, user);
    
  } catch (err) {
    console.error('Facebook Auth Error:', err);
    console.error('Error details:', err.original || err.message);
    return done(err, null);
  }
}));

// 🔹 Serialize user for session
passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.id);
  done(null, user.id);
});

// 🔹 Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    if (!user) {
      console.log('User not found during deserialization:', id);
      return done(new Error('User not found'), null);
    }
    console.log('Deserialized user:', user.id);
    done(null, user);
  } catch (err) {
    console.error('Deserialization Error:', err);
    done(err, null);
  }
});

module.exports = passport;