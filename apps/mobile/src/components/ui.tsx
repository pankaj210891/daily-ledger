import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette } from "@/lib/theme";
import { money, monthTitle, shiftMonth } from "@/lib/dates";

export function Screen({children}:PropsWithChildren) {
  return <SafeAreaView style={styles.safe} edges={["top"]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>;
}
export function PageHeading({eyebrow,title,subtitle}:{eyebrow?:string;title:string;subtitle?:string}) {
  return <View style={styles.heading}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}
export function MonthPicker({month,onChange}:{month:string;onChange:(value:string)=>void}) {
  return <View style={styles.monthRow}>
    <Pressable accessibilityLabel="Previous month" onPress={()=>onChange(shiftMonth(month,-1))} style={styles.monthButton}><Text style={styles.monthArrow}>‹</Text></Pressable>
    <Text style={styles.monthText}>{monthTitle(month)}</Text>
    <Pressable accessibilityLabel="Next month" onPress={()=>onChange(shiftMonth(month,1))} style={styles.monthButton}><Text style={styles.monthArrow}>›</Text></Pressable>
  </View>;
}
export function Card({children,style}:{children:ReactNode;style?:object}) {
  return <View style={[styles.card,style]}>{children}</View>;
}
export function Metric({label,value,detail,tone="green"}:{label:string;value:string|number;detail?:string;tone?:"green"|"orange"|"blue"|"purple"}) {
  const color=tone==="orange"?palette.orange:tone==="blue"?palette.blue:tone==="purple"?palette.purple:palette.green;
  const wash=tone==="orange"?palette.orangeSoft:tone==="blue"?palette.blueSoft:tone==="purple"?palette.purpleSoft:palette.greenSoft;
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text>{detail?<Text style={styles.metricDetail}>{detail}</Text>:null}<View style={[styles.metricAccent,{backgroundColor:wash}]}><View style={[styles.metricDot,{backgroundColor:color}]}/></View></View>;
}
export function ActionButton({title,onPress,secondary=false,disabled=false}:{title:string;onPress:()=>void;secondary?:boolean;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({pressed})=>[styles.action,secondary&&styles.actionSecondary,disabled&&styles.disabled,pressed&&!disabled&&styles.pressed]}><Text style={[styles.actionText,secondary&&styles.actionSecondaryText]}>{title}</Text></Pressable>;
}
export function Message({text,type="error"}:{text:string;type?:"error"|"info"}) {
  return <View accessibilityRole={type==="error"?"alert":"text"} style={[styles.message,type==="info"?styles.info:styles.error]}><Text style={{color:type==="info"?palette.text:palette.red,fontSize:13,lineHeight:19}}>{text}</Text></View>;
}
export function Busy({label="Loading your household…"}:{label?:string}) {
  return <View style={styles.busy}><ActivityIndicator color={palette.green}/><Text style={styles.muted}>{label}</Text></View>;
}
export function formatMoney(amount:number) { return money(amount); }
export function formatMonth(month:string) { return monthTitle(month); }

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.background},content:{paddingHorizontal:20,paddingTop:16,paddingBottom:40,gap:20,maxWidth:720,width:"100%",alignSelf:"center"},
  heading:{gap:8,paddingTop:8,paddingBottom:6},eyebrow:{fontSize:10,fontWeight:"800",letterSpacing:1.35,color:"#91a096"},title:{fontSize:29,fontWeight:"800",letterSpacing:-0.7,color:palette.ink},subtitle:{fontSize:14,lineHeight:21,color:palette.muted},
  monthRow:{minHeight:48,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:4,borderWidth:1,borderColor:palette.line,borderRadius:12,backgroundColor:"white"},monthText:{fontSize:15,fontWeight:"700",color:palette.text},monthButton:{width:42,height:42,alignItems:"center",justifyContent:"center"},monthArrow:{fontSize:30,lineHeight:34,color:palette.green},
  card:{padding:16,backgroundColor:"white",borderWidth:1,borderColor:palette.line,borderRadius:14,shadowColor:"#183e28",shadowOpacity:0.035,shadowRadius:6,shadowOffset:{width:0,height:2},elevation:1},
  metric:{minHeight:122,flex:1,padding:14,borderRadius:14,backgroundColor:"white",borderWidth:1,borderColor:palette.line,overflow:"hidden",justifyContent:"space-between"},metricLabel:{fontSize:10,fontWeight:"800",letterSpacing:0.7,color:"#89958c"},metricValue:{fontSize:23,fontWeight:"800",letterSpacing:-0.5,color:palette.ink,marginTop:11},metricDetail:{fontSize:10,lineHeight:14,color:palette.muted,marginTop:5},metricAccent:{position:"absolute",right:-18,bottom:-30,width:64,height:64,borderRadius:40,alignItems:"center",justifyContent:"center"},metricDot:{width:8,height:8,borderRadius:5,marginTop:-12,marginLeft:-12},
  action:{minHeight:48,paddingHorizontal:18,borderRadius:11,backgroundColor:palette.green,alignItems:"center",justifyContent:"center"},actionText:{color:"white",fontSize:14,fontWeight:"700"},actionSecondary:{backgroundColor:"white",borderWidth:1,borderColor:palette.line},actionSecondaryText:{color:palette.text},disabled:{opacity:0.6},pressed:{opacity:0.86,transform:[{scale:0.99}]},
  message:{padding:12,borderRadius:10},error:{backgroundColor:palette.redSoft},info:{backgroundColor:palette.greenSoft},busy:{minHeight:100,alignItems:"center",justifyContent:"center",gap:10},muted:{fontSize:13,color:palette.muted}
});
