import dotenv from "dotenv";
import mongoose from "mongoose";
import { UserModel } from "../src/modules/users/models/user.model";

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/hypermarket";
  console.log("Connecting to", uri);
  await mongoose.connect(uri);

  try {
    // Delete existing test user to start clean
    await UserModel.deleteOne({ email: "admin@test.com" });

    // Create the admin user (triggers the pre-save bcrypt hash hook)
    const admin = await UserModel.create({
      name: "Admin Test",
      email: "admin@test.com",
      password: "123456",
      role: "admin",
    });

    console.log("Admin user created successfully:", {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      passwordHash: admin.password,
    });
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
