import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { palette } from "@/lib/theme";

export default function TabLayout() {
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:palette.green,
    tabBarInactiveTintColor:palette.muted,
    tabBarLabelStyle:{fontSize:11,fontWeight:"600",marginTop:2},
    tabBarIconStyle:{marginTop:2},
    tabBarStyle:{height:88,paddingTop:7,paddingBottom:24,borderTopColor:palette.line,backgroundColor:"white"},
    sceneStyle:{backgroundColor:palette.background},
  }}>
    <Tabs.Screen name="home" options={{title:"Home",tabBarLabel:"Home",tabBarIcon:({color,size,focused})=><SymbolView name={{ios:focused?"house.fill":"house",android:"home",web:"home"}} tintColor={color} size={size}/>}}/>
    <Tabs.Screen name="deliveries" options={{title:"Deliveries",tabBarLabel:"Deliveries",tabBarIcon:({color,size})=><SymbolView name={{ios:"shippingbox.fill",android:"local_shipping",web:"local_shipping"}} tintColor={color} size={size}/>}}/>
    <Tabs.Screen name="bills" options={{title:"Bills",tabBarLabel:"Bills",tabBarIcon:({color,size,focused})=><SymbolView name={{ios:focused?"doc.text.fill":"doc.text",android:"receipt_long",web:"receipt_long"}} tintColor={color} size={size}/>}}/>
    <Tabs.Screen name="staff" options={{title:"Staff",tabBarLabel:"Staff",tabBarIcon:({color,size,focused})=><SymbolView name={{ios:focused?"person.2.fill":"person.2",android:"groups",web:"groups"}} tintColor={color} size={size}/>}}/>
    <Tabs.Screen name="more" options={{title:"More",tabBarLabel:"More",tabBarIcon:({color,size})=><SymbolView name={{ios:"ellipsis",android:"more_horiz",web:"more_horiz"}} tintColor={color} size={size}/>}}/>
  </Tabs>;
}
