const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const InstagramStrategy = require('passport-instagram').Strategy;
const { pool } = require('./pg');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const findOrCreateSocialUser = async ({ provider, socialId, email, name, avatar }) => {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }

  const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (checkUser.rows.length > 0) {
    const user = checkUser.rows[0];
    // Update provider information if necessary
    const updateRes = await pool.query(
      'UPDATE users SET provider = COALESCE($1, provider), social_id = COALESCE($2, social_id), avatar = COALESCE($3, avatar) WHERE id = $4 RETURNING *',
      [provider, socialId, avatar || user.avatar, user.id]
    );
    return updateRes.rows[0];
  }

  const defaultAvatar = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1A56DB&color=fff`;

  const insertRes = await pool.query(
    'INSERT INTO users (name, email, provider, social_id, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, email, provider, socialId, defaultAvatar]
  );
  
  return insertRes.rows[0];
};

const setupPassport = () => {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${BACKEND_URL}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 'Google User';
            const avatar = profile.photos?.[0]?.value;
            const user = await findOrCreateSocialUser({
              provider: 'google',
              socialId: profile.id,
              email: email || `${profile.id}@google.local`,
              name,
              avatar,
            });
            done(null, user);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
  }

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: `${BACKEND_URL}/api/auth/facebook/callback`,
          profileFields: ['id', 'emails', 'displayName', 'photos'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName || 'Facebook User';
            const avatar = profile.photos?.[0]?.value;
            const user = await findOrCreateSocialUser({
              provider: 'facebook',
              socialId: profile.id,
              email: email || `${profile.id}@facebook.local`,
              name,
              avatar,
            });
            done(null, user);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
  }

  if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
    passport.use(
      new InstagramStrategy(
        {
          clientID: process.env.INSTAGRAM_CLIENT_ID,
          clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
          callbackURL: `${BACKEND_URL}/api/auth/instagram/callback`,
          scope: ['user_profile'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value || `${profile.id}@instagram.local`;
            const name = profile.displayName || profile.username || 'Instagram User';
            const avatar = profile.photos?.[0]?.value || profile._json?.data?.profile_picture;
            const user = await findOrCreateSocialUser({
              provider: 'instagram',
              socialId: profile.id,
              email,
              name,
              avatar,
            });
            done(null, user);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      if (!pool) {
        return done(new Error('Pool not initialized'), null);
      }
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (res.rows.length === 0) {
        return done(null, null);
      }
      done(null, res.rows[0]);
    } catch (error) {
      done(error, null);
    }
  });
};

module.exports = {
  passport,
  setupPassport,
};
