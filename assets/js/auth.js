import { toast } from "./helper.js";

export function login(email, password) {
  if (!email || !password) {
    toast("Please enter your email and password.");
    return false;
  }
  toast("Welcome back to Beji Healing.");
  location.hash = "#/dashboard";
  return true;
}

window.login = login;
