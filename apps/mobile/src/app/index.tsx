import { Redirect } from "expo-router";
import { useAuth } from "@/providers/auth";

export default function IndexRoute() {
  const { user } = useAuth();
  return <Redirect href={user ? "/(tabs)/home" : "/sign-in"} />;
}
