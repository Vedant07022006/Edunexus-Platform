import { Course } from "../modules/course/course.model.js";
import { User } from "../modules/user/user.model.js";
import logger from "../utils/logger.js";

/**
 * Cleanup job that archives courses whose instructor was permanently deleted.
 */
export const cleanupOrphanedCourses = async () => {
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
      logger.info(`[Cleanup] Archived ${result.modifiedCount} orphaned course(s) from ${orphanedIds.length} deleted instructor(s)`);
    }
  } catch (err) {
    logger.error("[Cleanup] Failed to clean orphaned courses:", err.message);
  }
};
