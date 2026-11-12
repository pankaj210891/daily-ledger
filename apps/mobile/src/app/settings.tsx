import { router } from "expo-router";
import { StyleSheet,Text } from "react-native";
import { useAuth } from "@/providers/auth";
import { palette } from "@/lib/theme";
import { ActionButton,Card,PageHeading,Screen } from "@/components/ui";

export default function SettingsScreen(){
  const {user,signOut}=useAuth();
  return <Screen><Text onPress={()=>router.back()} style={styles.back}>‹  More</Text><PageHeading eyebrow="PREFERENCES" title="Settings" subtitle="Account and household information."/><Card><Text style={styles.label}>ACCOUNT</Text><Text style={styles.name}>{user?.name}</Text><Text style={styles.detail}>{user?.email}</Text><Text style={styles.detail}>Household ID · {user?.householdId}</Text></Card><Card><Text style={styles.name}>Household preferences aren’t available yet</Text><Text style={styles.detail}>The API does not expose profile, household, reminder, or preference settings yet.</Text></Card><ActionButton title="Sign out" secondary onPress={()=>void signOut()}/></Screen>;
}
const styles=StyleSheet.create({back:{minHeight:38,textAlignVertical:"center",color:palette.green,fontSize:14,fontWeight:"700"},label:{fontSize:10,fontWeight:"800",letterSpacing:.8,color:palette.muted},name:{fontSize:16,fontWeight:"800",color:palette.ink,marginTop:7},detail:{fontSize:12,lineHeight:18,color:palette.muted,marginTop:4}});
