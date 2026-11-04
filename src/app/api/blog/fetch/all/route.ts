import { NextRequest } from "next/server";
import dbConnect from "@/db/dbconnect";
import { BlogModel } from "@/schemas/blog.schema";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import { getAdminSession } from "@/lib/auth";
import { NOT_DELETED_FILTER, PUBLISHED_FILTER } from "@/lib/blog";

//  /api/blog/fetch/all?page=1&limit=10
//  Signed-in admins can pass includeArchived=true to also list archived posts.
export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10))
    );
    const skip = (page - 1) * limit;

    const includeArchived =
      searchParams.get("includeArchived") === "true" && (await getAdminSession(req)) !== null;
    const filter = includeArchived ? NOT_DELETED_FILTER : PUBLISHED_FILTER;

    const [blogs, total] = await Promise.all([
      BlogModel.find(filter)
        .select("title slug author coverImg archived createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BlogModel.countDocuments(filter),
    ]);

    return ApiResponse(
      200,
      {
        blogs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Blogs fetched successfully."
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return ApiResponse(error.statusCode, null, error.message);
    }

    console.error("[GET /api/blog/fetch/all] Unexpected error:", error);
    return ApiResponse(500, null, "An unexpected error occurred while fetching blogs.");
  }
}
