import { NextRequest } from "next/server";
import dbConnect from "@/db/dbconnect";
import { BlogModel } from "@/schemas/blog.schema";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import { getAdminSession } from "@/lib/auth";
import { revalidatePostPaths } from "@/lib/revalidate";

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return ApiResponse(401, null, "Unauthorized.");

  await dbConnect();

  try {
    const body = await req.json();

    const { title, content, author, slug, coverImg } = body;

    // Validation
    if (!title || !content || !author || !slug) {
      throw new ApiError(
        400,
        "title, content, author, and slug are required fields."
      );
    }

    if (content.length < 100) {
      throw new ApiError(400, "content must be at least 100 characters long.");
    }

    if (slug.length < 15 || slug.length > 100) {
      throw new ApiError(400, "slug must be between 15 and 100 characters.");
    }

    // Slug uniqueness check
    const existingBlog = await BlogModel.findOne({ slug });
    if (existingBlog) {
      throw new ApiError(
        409,
        `A blog with the slug "${slug}" already exists.`
      );
    }

    //  Create blog 
    const newBlog = await BlogModel.create({
      title: title.trim(),
      content,
      author: author.trim(),
      slug,
      coverImg: coverImg ?? null,
      createdBy: session.sub,
    });

    revalidatePostPaths(newBlog.slug);

    return ApiResponse(
      201,
      {
        _id: newBlog._id,
        title: newBlog.title,
        slug: newBlog.slug,
        author: newBlog.author,
        coverImg: newBlog.coverImg,
        createdAt: newBlog.createdAt,
      },
      "Blog created successfully."
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return ApiResponse(error.statusCode, null, error.message);
    }

    console.error("[POST /api/blog/create] Unexpected error:", error);
    return ApiResponse(500, null, "An unexpected error occurred while creating the blog.");
  }
}
