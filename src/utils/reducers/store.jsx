// store/index.js
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userReducer";
import moduleReducer from "./moduleReducer";

export const store = configureStore({
  reducer: {
    user: userReducer,
    modules: moduleReducer
  }
});
