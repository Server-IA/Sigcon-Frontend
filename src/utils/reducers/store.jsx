// store/index.js
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userReducer";

export const store = configureStore({
  reducer: {
    user: userReducer
  }
});
