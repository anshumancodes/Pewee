import { Schema, model, models, Types } from "mongoose";

export interface Series {
  name: string;
  description?:string;
  createdBy?: Types.ObjectId;
  deletedBy?: Types.ObjectId;
  archived?:boolean;
  
}


const seriesSchema = new Schema<Series>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
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
},{
  timestamps: true
})

export const SeriesModel =
  models.Series || model<Series>("Series", seriesSchema);