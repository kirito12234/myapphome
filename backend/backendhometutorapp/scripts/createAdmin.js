const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const connectDB = require("../src/config/db");
const User = require("../src/models/User");

const run = async () => {
  await connectDB();

  // non-interactive defaults (can be overridden with env)
  const name = process.env.ADMIN_NAME || "Admin User";
  const email = (process.env.ADMIN_EMAIL || "admin@hometutor.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";

  const exists = await User.findOne({ email });
  if (exists) {
    console.log("Admin with this email already exists.");
    await mongoose.connection.close();
    process.exit(0);
  }

  await User.create({ name, email, password, role: "admin" });
  console.log(`Admin created: ${email} / ${password}`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (err) => {
  console.error(err.message);
  await mongoose.connection.close();
  process.exit(1);
});


