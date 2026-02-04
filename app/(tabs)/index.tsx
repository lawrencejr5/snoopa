import ChatScreen from "@/components/ChatScreen";
import { SideMenu } from "@/components/SideMenu";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { createDrawerNavigator } from "@react-navigation/drawer";

const Drawer = createDrawerNavigator();

const IndexPage = () => {
  const { theme } = useTheme();
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
          width: "75%",
        },
      }}
    >
      <Drawer.Screen name="Chat" component={ChatScreen} />
    </Drawer.Navigator>
  );
};

export default IndexPage;
