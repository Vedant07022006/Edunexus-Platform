import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./db/index.js";
import { Course } from "./modules/course/course.model.js";
import { User } from "./modules/user/user.model.js";


// Archive courses whose instructor was permanently deleted from the DB
const cleanupOrphanedCourses = async () => {
  try {
    const allCourses = await Course.find({ isArchived: false }).select("instructor").lean();
    const instructorIds = [...new Set(allCourses.map((c) => c.instructor?.toString()).filter(Boolean))];

    // Find which instructor IDs no longer exist
    const existingUsers = await User.find({ _id: { $in: instructorIds } }).select("_id").lean();
    const existingIds = new Set(existingUsers.map((u) => u._id.toString()));
    const orphanedIds = instructorIds.filter((id) => !existingIds.has(id));

    if (orphanedIds.length > 0) {
      const result = await Course.updateMany(
        { instructor: { $in: orphanedIds }, isArchived: false },
        { $set: { isArchived: true, isPublished: false } }
      );
      console.log(`[Cleanup] Archived ${result.modifiedCount} orphaned course(s) from ${orphanedIds.length} deleted instructor(s)`);
    }
  } catch (err) {
    console.error("[Cleanup] Failed to clean orphaned courses:", err.message);
  }
};


const PORT = process.env.PORT || 8000;

connectDB()
  .then(async () => {
    // Clean up orphaned courses on startup
    await cleanupOrphanedCourses();

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    server.on("error", (error) => {
      console.error("Server error:", error.message);
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error("Error connecting to the database:", error);
    process.exit(1);
  });
