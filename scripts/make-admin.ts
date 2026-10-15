import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../src/modules/users/user.model";

// Load environment variables
dotenv.config();

const makeAdmin = async () => {
  const email = process.argv[2];

  if (!email) {
    console.error("Please provide an email address.");
    console.log("Usage: npx ts-node -r tsconfig-paths/register scripts/make-admin.ts <user-email>");
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to database.");

    // Find and update the user
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { role: "admin" },
      { new: true }
    );

    if (!user) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }

    console.log(`Success! User ${user.email} (${user.fullName}) is now an admin.`);
    process.exit(0);

  } catch (error) {
    console.error("Error making user admin:", error);
    process.exit(1);
  }
};

makeAdmin();
