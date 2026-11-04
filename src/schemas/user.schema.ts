import { Schema, model, models, type Model } from "mongoose";
import bcrypt from "bcrypt";
export enum RoleValues {
  ADMIN = "ADMIN",
  USER = "USER",
}
interface User {
  Name: string;
  username: string;
  profilePic?: string;
  email: string;
  password: string;
  role: RoleValues;
}

const UserSchema = new Schema<User>(
  {
    Name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      minlength: 4,
      maxlength: 15,
    },
    profilePic: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      select: false, 
    },
    role: {
      type: String,
      enum: Object.values(RoleValues),
      default: RoleValues.USER,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);
// Mongoose 9: async pre hooks resolve/throw instead of calling next()
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const saltRounds = 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
});
UserSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};
export const User: Model<User> =
  (models.User as Model<User>) || model<User>("User", UserSchema);
