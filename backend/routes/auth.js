const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sgMail = require("@sendgrid/mail");
const passport = require("passport");
const session = require('express-session');
const authenticateToken = require("../middleware/authMiddleware");
const Note = require("../models/Note");


sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const otpStore = new Map(); // In-memory OTP store
const app = express();


// ------------------ Google Authentication Middleware ------------------

app.use(session({
  secret: 'your_secret',
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

// ------------------ Register ------------------
router.post("/register", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword)
      return res.status(400).json({ error: "Passwords do not match" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });

    res.status(201).json({ message: "User registered", userId: user.id });
  } catch (err) {
    res.status(400).json({ error: "Email already exists or invalid input" });
  }
});

// ------------------ Login ------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: req.t("invalid_credentials") });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: req.t("invalid_credentials") });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: req.t("login_success"), token });
  } catch (err) {
    res.status(500).json({ error: req.t("server_error") });
  }
});


// ------------------ Forgot Password (Send OTP via Email) ------------------
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(404).json({ error: "Email not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, createdAt: Date.now() });

  const msg = {
    to: email,
    from: process.env.SENDGRID_SENDER_EMAIL,
    subject: "Your OTP for Password Reset",
    text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
    html: `<strong>Your OTP is: ${otp}</strong><br>It will expire in 10 minutes.`,
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

  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(404).json({ error: "User not found" });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  otpStore.delete(email); // Cleanup
  res.json({ message: "Password reset successful" });
});

// ------------------ Google Auth Routes ------------------

router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"]
}));

// ✅ Callback route
router.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login-failed",
    session: false
  }),
  (req, res) => {
    res.json({
      message: "Google login successful",
      user: req.user
    });
  }
);

// Facebbok login route
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));

// ✅ Facebook callback

router.get("/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/login-failed",
    session: false
  }),
  (req, res) => {
    res.json({
      message: "Facebook login successful",
      user: req.user
    });
  }
);

// language change

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

// update profile

router.put("/update-profile/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { email, currentPassword, newPassword } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Update email
    if (email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail && existingEmail.id !== user.id) {
        return res.status(400).json({ error: "Email already in use" });
      }
      user.email = email.toLowerCase();
    }

    // ✅ Update password
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// notes 
router.post("/notes", authenticateToken, async (req, res) => {
  const { title, content } = req.body || {};
  const userId = req.user.userId;

  console.log("Input:", { title, content, userId });

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  try {
    const note = await Note.create({ title, content, userId });
    res.status(201).json(note);
  } catch (err) {
    console.error("Note creation error:", err);
    res.status(500).json({ error: "Failed to create note" });
  }
});


router.get("/notes/:id", authenticateToken, async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.userId;

  try {
    const note = await Note.findOne({
      where: {
        id: noteId,
        userId: userId, // ensures the user can only access their own notes
      },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found or access denied" });
    }

    res.json(note);
  } catch (err) {
    console.error("Fetch single note error:", err);
    res.status(500).json({ error: "Failed to fetch note" });
  }
});
router.put("/notes/:id", authenticateToken, async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.userId;
  const { title, content } = req.body;

  try {
    const note = await Note.findOne({ where: { id: noteId, userId } });

    if (!note) {
      return res.status(404).json({ error: "Note not found or access denied" });
    }

    // Update fields if provided
    if (title) note.title = title;
    if (content) note.content = content;

    await note.save();

    res.json({ message: "Note updated successfully", note });
  } catch (err) {
    console.error("Update note error:", err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

router.delete("/notes/:id", authenticateToken, async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.userId;

  try {
    const note = await Note.findOne({ where: { id: noteId, userId } });

    if (!note) {
      return res.status(404).json({ error: "Note not found or access denied" });
    }

    await note.destroy();

    res.json({ message: "Note deleted successfully" });
  } catch (err) {
    console.error("Delete note error:", err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});



module.exports = router;
