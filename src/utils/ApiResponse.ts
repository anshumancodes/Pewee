import { NextResponse } from "next/server";

type ApiData<T = unknown> = {
  statuscode: number;
  data: T;
  message: string;
};

export const ApiResponse = async <T>(
  statuscode: number,
  data: T,
  message: string
) => {
  return NextResponse.json<ApiData<T>>(
    {
      statuscode,
      data,
      message,
    },
    { status: statuscode }
  );
};