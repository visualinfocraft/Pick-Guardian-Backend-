const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
const passport = require("passport");
const session = require("express-session");
const authenticateToken = require("../middleware/authMiddleware");
const knex = require("../config/Knex");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const otpStore = new Map(); // In-memory OTP store

// ------------------ Google Authentication Middleware ------------------
router.use(session({
  secret: 'your_secret',
  resave: false,
  saveUninitialized: true,
}));

router.use(passport.initialize());
router.use(passport.session());

// ------------------ Register ------------------


 router.post("/register", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword)
      return res.status(400).json({ error: "Passwords do not match" });

    const existingUser = await knex("users").where({ email }).first();
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await knex("users").insert({ email, passwordHash }).returning("*");

    res.status(201).json({ message: "User registered", userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Registration failed" });
  }
});

// ------------------ Login ------------------

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

 if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await knex("users").where({ email }).first();
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "2h" });
    res.json({ message: "Login success", token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
 
// ------------------ Forgot Password (Send OTP via Email) ------------------
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  const user = await knex("users").where({ email }).first();
  if (!user) return res.status(404).json({ error: "Email not found" });

  const otp = Math.floor(10000 + Math.random() * 90000).toString();
  otpStore.set(email, { otp, createdAt: Date.now() });

 const msg = {
  to: email,
  from: `Pick Guardian <${process.env.SENDGRID_SENDER_EMAIL}>`,
  subject: "Your OTP Code - Pick Guardian",
  html: `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 30px auto; background-color: #ffffff; border-radius: 10px; padding: 30px 20px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">

      <!-- Logo -->
     <div style="text-align: center;">
  <img src="https://i.postimg.cc/02SK1WN3/logo.png" alt="Pick Guardian Logo" style="display: inline-block; max-width: 100px; margin-bottom: 16px;" />
</div>
      <!-- Message -->
      <p style="text-align: center; font-size: 14px; color: #4a5568; margin: 0 0 24px;">
        Use the following One Time Password (OTP) to reset your password. This OTP is valid for the next <strong>10 minutes</strong>.
      </p>

      <!-- OTP Box -->
      <div style="text-align: center; margin: 24px 0;">
        <span style="display: inline-block; background: #e9f1ff; padding: 14px 32px; font-size: 28px; font-weight: bold; color: #1a73e8; border-radius: 10px; letter-spacing: 4px;">
          ${otp}
        </span>
      </div>

      <!-- Footer -->
      <p style="text-align: center; font-size: 12px; color: #a0aec0; margin-top: 30px;">
        If you didn’t request this, you can ignore this email.
      </p>

    </div>
  `,
};


  try {
    await sgMail.send(msg);
    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP email" });
  }
});

// ------------------ Confirm OTP ------------------
router.post("/confirm-otp", (req, res) => {
  const { email, otp } = req.body;
  const data = otpStore.get(email);

  if (!data) return res.status(400).json({ error: "OTP expired or not found" });

  const isValid = data.otp === otp && Date.now() - data.createdAt < 10 * 60 * 1000;
  if (!isValid) return res.status(400).json({ error: "Invalid or expired OTP" });

  otpStore.set(email, { ...data, verified: true });
  res.json({ message: "OTP verified successfully" });
});

// ------------------ Reset Password ------------------
router.post("/reset-password", async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;
  const data = otpStore.get(email);

  if (!data || !data.verified)
    return res.status(400).json({ error: "OTP verification required" });

  if (newPassword !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  const user = await knex("users").where({ email }).first();
  if (!user) return res.status(404).json({ error: "User not found" });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await knex("users").where({ email }).update({ passwordHash });

  otpStore.delete(email); // Cleanup
  res.json({ message: "Password reset successful" });
});

// ------------------ Google Auth Routes ------------------
router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"]
}));

router.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login-failed"
  }),
  (req, res) => {
    const userData = {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      provider: req.user.provider
    };
    
    res.json({
      message: "Google login successful",
      user: userData
    });
  }
);

// ------------------ Facebook login ------------------
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));

router.get("/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/login-failed"
  }),
  (req, res) => {
    const userData = {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      provider: req.user.provider
    };
    
    res.json({
      message: "Facebook login successful",
      user: userData
    });
  }
);

// ------------------ Language Change Text ------------------
router.get('/text', (req, res) => {
  const t = req.t;
  res.json({
    heading: t('language_heading'),
    subtext: t('language_subtext'),
    login_title: t('login_title'),
    email_label: t('email_label'),
    password_label: t('password_label'),
    confirm_password_label: t('confirm_password_label')
  });
});

// ------------------ Update Profile ------------------
router.put("/update-profile/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { email, currentPassword, newPassword } = req.body;

  const userId = parseInt(id, 10);
  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const user = await knex("users").where({ id: userId }).first();
    if (!user) return res.status(404).json({ error: "User not found" });

    if (email) {
      const existingEmail = await knex("users").where({ email }).andWhereNot({ id: userId }).first();
      if (existingEmail) {
        return res.status(400).json({ error: "Email already in use" });
      }
      await knex("users").where({ id: userId }).update({ email: email.toLowerCase() });
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await knex("users").where({ id: userId }).update({ passwordHash });
    }

    const updatedUser = await knex("users").where({ id: userId }).first();
    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ------------------ Notes Routes ------------------

// Create Note
router.post("/notes", authenticateToken, async (req, res) => {
  const { title, content } = req.body || {};
  const userId = parseInt(req.user.userId, 10);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  try {
    const [note] = await knex("notes").insert({ title, content, userId }).returning("*");
    res.status(201).json(note);
  } catch (err) {
    console.error("Note creation error:", err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

// Get Single Note
router.get("/notes/:id", authenticateToken, async (req, res) => {
  const noteId = parseInt(req.params.id, 10);
  const userId = parseInt(req.user.userId, 10);

  if (!noteId || isNaN(noteId)) {
    return res.status(400).json({ error: "Invalid note ID" });
  }

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const note = await knex("notes").where({ id: noteId, userId }).first();

    if (!note) {
      return res.status(404).json({ error: "Note not found or access denied" });
    }

    res.json(note);
  } catch (err) {
    console.error("Fetch single note error:", err);
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

// Update Note
router.put("/notes/:id", authenticateToken, async (req, res) => {
  const noteId = parseInt(req.params.id, 10);
  const userId = parseInt(req.user.userId, 10);
  const { title, content } = req.body;

  if (!noteId || isNaN(noteId)) {
    return res.status(400).json({ error: "Invalid note ID" });
  }

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const note = await knex("notes").where({ id: noteId, userId }).first();

    if (!note) {
      return res.status(404).json({ error: "Note not found or access denied" });
    }

    await knex("notes").where({ id: noteId, userId }).update({
      title: title || note.title,
      content: content || note.content,
      updated_at: knex.fn.now()
    });

    const updatedNote = await knex("notes").where({ id: noteId }).first();
    res.json({ message: "Note updated successfully", note: updatedNote });
  } catch (err) {
    console.error("Update note error:", err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

// Delete Note
router.delete("/notes/:id", authenticateToken, async (req, res) => {
  const noteId = parseInt(req.params.id, 10);
  const userId = parseInt(req.user.userId, 10);

  if (!noteId || isNaN(noteId)) {
    return res.status(400).json({ error: "Invalid note ID" });
  }

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const note = await knex("notes").where({ id: noteId, userId }).first();

    if (!note) {
      return res.status(404).json({ error: "Note not found or access denied" });
    }

    await knex("notes").where({ id: noteId }).del();

    res.json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error("Delete note error:", err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

module.exports = router;
