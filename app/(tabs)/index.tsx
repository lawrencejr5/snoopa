import ChatScreen from "@/components/ChatScreen";
import Loading from "@/components/Loading";
import { SideMenu } from "@/components/SideMenu";
import Colors from "@/constants/Colors";
import { useLoadingContext } from "@/context/LoadingContext";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useConvexAuth } from "convex/react";

const Drawer = createDrawerNavigator();

const IndexPage = () => {
  const { isLoading } = useConvexAuth();
  const { appLoading } = useLoadingContext();
  const { theme } = useTheme();

  const { signedIn } = useUser();

  if (isLoading || !signedIn || appLoading) return <Loading />;

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
