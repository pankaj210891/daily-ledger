import { useCallback,useEffect,useState } from "react";
import { Pressable,StyleSheet,Text,View } from "react-native";
import { router } from "expo-router";
import { api,type ScheduledDelivery } from "@/lib/api";
import { dateTitle,monthBounds,monthKey,monthTitle } from "@/lib/dates";
import { palette } from "@/lib/theme";
import { Busy,Card,Message,MonthPicker,PageHeading,Screen } from "@/components/ui";

export default function DeliveriesScreen() {
  const [month,setMonth]=useState(monthKey());
  const [items,setItems]=useState<ScheduledDelivery[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const load=useCallback(async()=>{
    try {const range=monthBounds(month);setItems(await api.generateDeliveries(range.from,range.to));}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to load deliveries.");}
    finally{setLoading(false);}
  },[month]);
  // The loader only commits state after its async API request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void load();},[load]);
  return <Screen>
    <PageHeading eyebrow="DAILY OPERATIONS" title="Deliveries" subtitle="Track scheduled, partial, and completed deliveries."/>
    <MonthPicker month={month} onChange={(value)=>{setLoading(true);setError("");setMonth(value);}}/>
    {error?<Message text={error}/>:null}
    {loading?<Busy label={"Preparing "+monthTitle(month)+" deliveries…"} />:items.length?<View style={styles.list}>{items.map(item=><DeliveryCard key={item._id} item={item} month={month}/>)}</View>:<Card><Text style={styles.emptyTitle}>No deliveries scheduled</Text><Text style={styles.emptyCopy}>Add a product and set its delivery schedule to see items here.</Text></Card>}
    <Pressable onPress={()=>{setLoading(true);void load();}} style={styles.refresh}><Text style={styles.refreshText}>Refresh schedule</Text></Pressable>
  </Screen>;
}

function DeliveryCard({item,month}:{item:ScheduledDelivery;month:string}) {
  const statusLabel=item.status.replace("_"," ");
  const done=["fully_delivered","cancelled","skipped","zero_consumption"].includes(item.status);
  return <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:"/delivery",params:{id:item._id,month}})} style={({pressed})=>[styles.card,pressed&&styles.pressed]}>
    <View style={styles.cardHeader}><View style={styles.mainCopy}><Text style={styles.name}>{item.productName}</Text><Text style={styles.when}>{dateTitle(item.scheduledDate)} · {item.timeSlot}</Text></View><View style={[styles.badge,done?styles.badgeDone:item.status==="partially_delivered"?styles.badgePartial:styles.badgePending]}><Text style={[styles.badgeText,done?styles.badgeTextDone:item.status==="partially_delivered"?styles.badgeTextPartial:styles.badgeTextPending]}>{statusLabel}</Text></View></View>
    <View style={styles.quantityRow}><Text style={styles.quantityLabel}>Delivered</Text><Text style={styles.quantityValue}>{item.deliveredQuantity} / {item.expectedQuantity} {item.unit}</Text></View>
    {item.closeReason?<Text style={styles.reason}>{item.closeReason}</Text>:null}
    <Text style={styles.openLink}>View or record delivery →</Text>
  </Pressable>;
}
const styles=StyleSheet.create({
  list:{gap:10},card:{padding:15,borderRadius:14,backgroundColor:"white",borderWidth:1,borderColor:palette.line,gap:12},pressed:{opacity:0.86},cardHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",gap:10},mainCopy:{flex:1,gap:4},name:{fontSize:16,fontWeight:"800",color:palette.ink},when:{fontSize:12,color:palette.muted,textTransform:"capitalize"},badge:{paddingHorizontal:9,paddingVertical:6,borderRadius:30},badgeDone:{backgroundColor:palette.greenSoft},badgePending:{backgroundColor:palette.orangeSoft},badgePartial:{backgroundColor:palette.blueSoft},badgeText:{fontSize:10,fontWeight:"700",textTransform:"capitalize"},badgeTextDone:{color:palette.green},badgeTextPending:{color:palette.orange},badgeTextPartial:{color:palette.blue},quantityRow:{flexDirection:"row",justifyContent:"space-between",paddingTop:9,borderTopWidth:1,borderTopColor:palette.line},quantityLabel:{fontSize:12,color:palette.muted},quantityValue:{fontSize:13,fontWeight:"700",color:palette.text},reason:{fontSize:12,color:palette.muted},openLink:{fontSize:12,fontWeight:"700",color:palette.green,marginTop:2},emptyTitle:{fontSize:16,fontWeight:"800",color:palette.ink,marginBottom:5},emptyCopy:{fontSize:13,color:palette.muted,lineHeight:19},refresh:{alignSelf:"center",minHeight:42,justifyContent:"center",paddingHorizontal:12},refreshText:{fontSize:13,fontWeight:"700",color:palette.green}
});
