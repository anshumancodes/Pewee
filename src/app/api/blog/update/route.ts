import { NextRequest } from "next/server";
import dbConnect from "@/db/dbconnect";
import { BlogModel } from "@/schemas/blog.schema";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import { getAdminSession } from "@/lib/auth";
import { revalidatePostPaths } from "@/lib/revalidate";

// /api/blog/update
export async function PATCH(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return ApiResponse(401, null, "Unauthorized.");

  await dbConnect();

  try {
    const body = await req.json();
    const { slug, title, content, author, coverImg, newSlug, archived } = body;

    if (!slug) {
      throw new ApiError(
        400,
        "slug is required to identify the blog to update.",
      );
    }

    // Build update payload with only provided fields
    const updates: Record<string, string | boolean | null> = {};

    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) {
      if (content.length < 100) {
        throw new ApiError(
          400,
          "content must be at least 100 characters long.",
        );
      }
      updates.content = content;
    }
    if (author !== undefined) updates.author = author.trim();
    if (coverImg !== undefined) updates.coverImg = coverImg;
    if (archived !== undefined) updates.archived = Boolean(archived);
    if (newSlug !== undefined) {
      if (newSlug.length < 15 || newSlug.length > 100) {
        throw new ApiError(400, "slug must be between 15 and 100 characters.");
      }
      // to ensure new slug isn't taken by another blog yk
      const slugConflict = await BlogModel.findOne({
        slug: newSlug,
        _id: {
          $ne: (await BlogModel.findOne({ slug }).select("_id").lean())?._id,
        },
      });
      if (slugConflict) {
        throw new ApiError(
          409,
          `A blog with the slug "${newSlug}" already exists.`,
        );
      }
      updates.slug = newSlug;
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, "No valid fields provided to update.");
    }

    const updatedBlog = await BlogModel.findOneAndUpdate(
      { slug, $or: [{ deletedBy: { $exists: false } }, { deletedBy: null }] },
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    if (!updatedBlog) {
      throw new ApiError(404, `Blog with slug "${slug}" not found.`);
    }

    revalidatePostPaths(slug, updates.slug as string | undefined);

    return ApiResponse(200, updatedBlog, "Blog updated successfully.");
  } catch (error) {
    if (error instanceof ApiError) {
      return ApiResponse(error.statusCode, null, error.message);
    }

    console.error("[PATCH /api/blog/update] Unexpected error:", error);
    return ApiResponse(
      500,
      null,
      "An unexpected error occurred while updating the blog.",
    );
  }
}
