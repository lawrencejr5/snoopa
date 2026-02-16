import ChatScreen from "@/components/ChatScreen";
import Loading from "@/components/Loading";
import { SideMenu } from "@/components/SideMenu";
import Colors from "@/constants/Colors";
import { useLoadingContext } from "@/context/LoadingContext";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useConvexAuth, useQuery } from "convex/react";

const Drawer = createDrawerNavigator();

const IndexPage = () => {
  const { isLoading } = useConvexAuth();
  const { appLoading } = useLoadingContext();
  const { theme } = useTheme();

  const { signedIn } = useUser();
  const watchlists = useQuery(api.watchlist.get_watchlists) || [];

  if (isLoading || !signedIn || appLoading || !watchlists) return <Loading />;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <SideMenu {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "slide",
        swipeEdgeWidth: 80,
        overlayColor: "transparent",
        drawerStyle: {
          backgroundColor: Colors[theme].background,
          width: "80%",
        },
      }}
    >
      <Drawer.Screen name="Chat" component={ChatScreen} />
    </Drawer.Navigator>
  );
};

export default IndexPage;
