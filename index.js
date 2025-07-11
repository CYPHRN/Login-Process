import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import connectDB from "./db/database.js";
import User from "./db/models/user.js";
import bcrypt from "bcrypt";
import session from "express-session";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

// Set EJS as view engine
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// Serve static files
app.use(express.static(__dirname + "/public"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Config
app.use(
  session({
    secret: process.env.SESSION_SECRET || "our-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // SET TRUE IN PRODUCTION HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24h
    },
  })
);

// Connect to DB
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});

// Middleware Auth check
const isAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/login");
  }
};

// Routes
app.get("/", isAuth, (req, res) => {
  if (isAuth) {
    res.redirect("/dashboard");
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});

app.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.log("Logout error:", error);
      return res.status(500).send("Error during logout");
    }

    // Clear the cookie
    res.clearCookie("connect.sid");
    // 'connect.sid' is the default name for the session cookie

    // Redirect to home or login page
    res.redirect("/");
  });
});

app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/public/register.html");
});

// Profile Endpoint
app.get("/profile", isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect("/login");
    }

    res.render("profile", {
      username: user.username,
      email: user.email,
      created: user.createdAt ? user.createdAt.toLocaleDateString() : "Unknown",
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).send("Error loading profile");
  }
});

app.get("/dashboard", isAuth, (req, res) => {
  res.sendFile(__dirname + "/public/dashboard.html");
});

app.get("/forum", (req, res) => {
  if (isAuth) {
    res.sendFile(__dirname + "/public/forum.html");
  } else {
    res.redirect("/");
  }
});

// Registration Endpoint
app.post("/register-user", async (req, res) => {
  try {
    const { email, username, password, pswrepeat } = req.body;

    // Check if User already exists
    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    // Hash password
    const saltRounds = 10;

    if (pswrepeat !== password) {
      res.status(400).send("Passwords do not match");
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new User
    const newUser = new User({
      email: email,
      username: username.toLowerCase(),
      password: hashedPassword,
    });

    await newUser.save();
    console.log(newUser);
    res.redirect("/login");
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).send("Error registering user");
  }
});

// Login Endpoint
app.post("/login-user", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });

    if (existingUser === null) {
      return res.status(401).send("Username or Password might be wrong");
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);

    if (isMatch !== true) {
      return res.status(401).send("Username or Password might be wrong");
    }

    req.session.userId = existingUser._id;
    req.session.username = existingUser.username;

    res.redirect("/");
  } catch (error) {
    console.log("Login error:", error);
    res.status(404).send("User not found");
  }
});
