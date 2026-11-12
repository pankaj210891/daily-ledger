import { router } from "expo-router";
import { Pressable,StyleSheet,Text,View } from "react-native";
import { useAuth } from "@/providers/auth";
import { palette } from "@/lib/theme";
import { ActionButton,Card,PageHeading,Screen } from "@/components/ui";

const modules=[
  {title:"Salary management",description:"Attendance-based salary estimates",path:"/salary" as const,icon:"₹"},
  {title:"Products & rates",description:"View household products and delivery schedules",path:"/products" as const,icon:"▤"},
  {title:"Household expenses",description:"Review and add manual expenses",path:"/expenses" as const,icon:"↗"},
  {title:"Reports",description:"Monthly activity, status filters, and outflow",path:"/reports" as const,icon:"▥"},
  {title:"Settings",description:"Account details and available preferences",path:"/settings" as const,icon:"⚙"},
];
export default function MoreScreen() {
  const {user,signOut}=useAuth();
  return <Screen>
    <PageHeading eyebrow="DAILY LEDGER" title="More" subtitle="Additional household tools and your account."/>
    {modules.map(item=><Pressable key={item.title} onPress={()=>router.push(item.path)} style={({pressed})=>[styles.menuCard,pressed&&styles.pressed]}><View style={styles.icon}><Text style={styles.iconText}>{item.icon}</Text></View><View style={styles.copy}><Text style={styles.menuTitle}>{item.title}</Text><Text style={styles.menuDescription}>{item.description}</Text></View><Text style={styles.arrow}>›</Text></Pressable>)}
    <Card><Text style={styles.accountLabel}>SIGNED IN AS</Text><Text style={styles.name}>{user?.name}</Text><Text style={styles.email}>{user?.email}</Text></Card>
    <ActionButton title="Sign out" secondary onPress={()=>void signOut()}/>
  </Screen>;
}
const styles=StyleSheet.create({
  menuCard:{minHeight:76,padding:13,flexDirection:"row",alignItems:"center",gap:12,borderRadius:14,borderWidth:1,borderColor:palette.line,backgroundColor:"white"},pressed:{opacity:.82},icon:{width:42,height:42,borderRadius:12,alignItems:"center",justifyContent:"center",backgroundColor:palette.greenSoft},iconText:{fontSize:19,fontWeight:"700",color:palette.green},copy:{flex:1,gap:4},menuTitle:{fontSize:14,fontWeight:"800",color:palette.ink},menuDescription:{fontSize:11,lineHeight:15,color:palette.muted},arrow:{fontSize:24,color:palette.muted},accountLabel:{fontSize:10,fontWeight:"800",letterSpacing:.9,color:palette.muted},name:{fontSize:16,fontWeight:"800",color:palette.ink,marginTop:7},email:{fontSize:12,color:palette.muted,marginTop:3}
});
