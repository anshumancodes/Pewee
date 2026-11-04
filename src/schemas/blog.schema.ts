import { Schema, model, models, Types } from "mongoose";
import { HydratedDocument } from "mongoose";

export interface Blog {
  title: string;
  content: string;
  author: string;
  slug:string;
  coverImg?: string | null;
  createdBy?: Types.ObjectId;
  deletedBy?: Types.ObjectId;
  archived?:boolean;
  series?:Types.ObjectId;
}

export type BlogDocument = HydratedDocument<Blog>;

const BlogSchema = new Schema<Blog>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
      minlength: 100,
    },
    slug: {
      type: String,
      required: true,
      minlength: 15,
      maxlength:100
    },

    author: {
      type: String,
      required: true,
      trim: true,
    },

    coverImg: {
      type: String,
      default: null,
    },

    series: {
      type: Schema.Types.ObjectId,
      ref: "Series", 
      default:null
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User", 
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    archived:{
      type:Boolean,
      default:false
    }
  },
  {
    timestamps: true,
  }
);

export const BlogModel =
  models.Blog || model<Blog>("Blog", BlogSchema);