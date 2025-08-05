const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
require("dotenv").config();
const db = require("../config/Knex");

// 🔹 Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google Profile:', profile);
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    const photoUrl = profile.photos?.[0]?.value;

    let user = await db("users").where({ googleId }).first();

    if (user) {
      console.log('Existing Google user found:', user.id, typeof user.id);
      console.log('User object:', user);
      return done(null, user.id);
    }

    // If email exists, try linking with existing user
    if (email) {
      user = await db("users").where({ email: email.toLowerCase() }).first();
      if (user) {
        const updatedUser = {
          googleId,
          displayName: user.displayName || profile.displayName,
          photo: user.photo || (photoUrl && photoUrl.length > 255 ? photoUrl.substring(0, 255) : photoUrl),
          provider: user.provider === 'local' ? 'local,google' : user.provider + ',google'
        };
        await db("users").where({ id: user.id }).update(updatedUser);
        user = { ...user, ...updatedUser };
        console.log('Linked Google account to existing user:', user.id, typeof user.id);
        console.log('Updated user object:', user);
        return done(null, user.id);
      }
    }

    // Create new user
    const newUser = {
      googleId,
      displayName: profile.displayName || 'Google User',
      email: email || null,
      photo: photoUrl && photoUrl.length > 255 ? photoUrl.substring(0, 255) : photoUrl,
      provider: 'google'
    };

const [{ id: userId }] = await db("users").insert(newUser).returning("id");
    console.log('Inserted userId:', userId, typeof userId);
    
 const cleanUserId = parseInt(userId, 10);
    console.log('Clean userId:', cleanUserId, typeof cleanUserId);
    
    const createdUser = await db("users").where({ id: cleanUserId }).first();
    console.log('New Google user created:', createdUser.id, typeof createdUser.id);
    console.log('Created user object:', createdUser);
    return done(null, createdUser.id);
  } catch (err) {
    console.error("Google Auth Error:", err.message);
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
    console.log('Facebook Profile:', profile);
    const facebookId = profile.id;
    const email = profile.emails?.[0]?.value;
    const photoUrl = profile.photos?.[0]?.value;

    let user = await db("users").where({ facebookId }).first();

    if (user) {
      console.log('Existing Facebook user found:', user.id);
      return done(null, user.id);
    }

    if (email) {
      user = await db("users").where({ email: email.toLowerCase() }).first();
      if (user) {
        const updatedUser = {
          facebookId,
          displayName: user.displayName || profile.displayName,
          photo: user.photo || (photoUrl && photoUrl.length > 255 ? photoUrl.substring(0, 255) : photoUrl),
          provider: user.provider === 'local' ? 'local,facebook' : user.provider + ',facebook'
        };
        await db("users").where({ id: user.id }).update(updatedUser);
        user = { ...user, ...updatedUser };
        console.log('Linked Facebook account to existing user:', user.id);
        return done(null, user.id);
      }
    }

    const newUser = {
      facebookId,
      displayName: profile.displayName || 'Facebook User',
      email: email || null,
      photo: photoUrl && photoUrl.length > 255 ? photoUrl.substring(0, 255) : photoUrl,
      provider: 'facebook'
    };

    const [{ id: userId }] = await db("users").insert(newUser).returning("id");
    console.log('Inserted userId:', userId, typeof userId);
    
    // Ensure userId is a primitive integer
    const cleanUserId = parseInt(userId, 10);
    console.log('Clean userId:', cleanUserId, typeof cleanUserId);
    
    const createdUser = await db("users").where({ id: cleanUserId }).first();
    console.log('New Facebook user created:', createdUser.id);
    return done(null, createdUser.id);
  } catch (err) {
    console.error("Facebook Auth Error:", err.message);
    return done(err, null);
  }
}));

// 🔹 Serialize user
passport.serializeUser((user, done) => {
  console.log("Serializing user:", user, typeof user);
  
  // Since OAuth strategies now pass just the ID, we can simplify this
  const userId = typeof user === 'object' && user !== null && 'id' in user ? user.id : user;
  
  console.log("✅ Serializing userId:", userId, typeof userId);
  done(null, userId);
});

// 🔹 Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    console.log("🔍 ID received in deserializeUser:", id, typeof id);

    // Handle different types of ID input
    let userId;
    if (typeof id === 'object' && id !== null) {
      console.log("🔍 ID is an object:", id);
      // If it's an object with an id property
      if ('id' in id) {
        userId = id.id;
        console.log("🔍 Extracted id from object:", userId);
      } else {
        // If it's a plain object, try to convert to string and parse
        userId = parseInt(Object.values(id)[0], 10);
        console.log("🔍 Parsed id from object values:", userId);
      }
    } else {
      // If it's already a primitive, use it directly
      userId = parseInt(id, 10);
      console.log("🔍 Parsed id from primitive:", userId);
    }

    console.log("✅ Cleaned userId:", userId, typeof userId);

    if (!userId || isNaN(userId)) {
      console.error("Invalid user ID:", id);
      return done(new Error("Invalid user ID"), null);
    }

    console.log("🔍 Querying database with userId:", userId, typeof userId);
    console.log("🔍 Query object:", { id: userId });
    const user = await db("users").where({ id: userId }).first();

    if (!user) {
      console.error("User not found for ID:", userId);
      return done(new Error("User not found"), null);
    }

    console.log("✅ User found:", user.id);
    done(null, user);
  } catch (err) {
    console.error("Deserialization error:", err.message);
    done(err, null);
  }
});


module.exports = passport;
