import { toast } from "./helper.js";
import { loginUser, routeForUser } from "./access.js";

export function login(email, password) {
  if (!email || !password) {
    toast("Please enter your email and password.");
    return false;
  }
  const user = loginUser(email, password);
  if (!user) {
    toast("Email atau password tidak sesuai.");
    return false;
  }
  toast(`Welcome back, ${user.name}.`);
  location.hash = `#/${routeForUser(user)}`;
  return true;
}

window.login = login;
