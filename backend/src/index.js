import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import app from "./app.js";
import { DB_NAME } from "./constants.js";
import connectDB from "./db/index.js";


const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
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
