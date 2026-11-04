import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/db/dbconnect";
import { User, RoleValues } from "@/schemas/user.schema";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import { ADMIN_COOKIE, SESSION_TTL_SECONDS, signAdminToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required.");
    }

    // Find user  select("+password")
    const user = await User.findOne({ email: String(email).trim().toLowerCase() })
      .select("+password");

    if (!user) {
      
      throw new ApiError(401, "Invalid email or password.");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new ApiError(401, "Invalid email or password.");
    }

    if (user.role !== RoleValues.ADMIN) {
      throw new ApiError(
        403,
        "Access denied. You need to be an admin to access the dashboard."
      );
    }

    // JWT valid for 8 hours
    const token = await signAdminToken({
      id: String(user._id),
      email: user.email,
      role: user.role,
      name: user.Name,
    });

    const response = NextResponse.json(
      {
        statuscode: 200,
        data: { name: user.Name, email: user.email, role: user.role },
        message: "Login successful.",
      },
      { status: 200 }
    );

    // HttpOnly cookie
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return ApiResponse(error.statusCode, null, error.message);
    }
    console.error("[POST /api/admin] Unexpected error:", error);
    return ApiResponse(500, null, "An unexpected error occurred.");
  }
}

// DELETE /api/admin  →  logout
export async function DELETE() {
  const response = NextResponse.json(
    { statuscode: 200, data: null, message: "Logged out." },
    { status: 200 }
  );
  response.cookies.set(ADMIN_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
