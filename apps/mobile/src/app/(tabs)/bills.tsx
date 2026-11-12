import { useCallback,useEffect,useState } from "react";
import { Pressable,StyleSheet,Text,View,type DimensionValue } from "react-native";
import { api,type MonthlyBill } from "@/lib/api";
import { dateTitle,monthKey,monthTitle,money } from "@/lib/dates";
import { palette } from "@/lib/theme";
import { Busy,Card,Message,MonthPicker,PageHeading,Screen } from "@/components/ui";

export default function BillsScreen() {
  const [month,setMonth]=useState(monthKey());
  const [bill,setBill]=useState<MonthlyBill|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const load=useCallback(async()=>{
    try{setBill(await api.prepareBill(month));}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to calculate the monthly bill.");}
    finally{setLoading(false);}
  },[month]);
  // The loader only commits state after its async API request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void load();},[load]);
  return <Screen>
    <PageHeading eyebrow="FINANCES" title="Monthly bills" subtitle="Product charges use the rate effective on each scheduled date."/>
    <MonthPicker month={month} onChange={(value)=>{setLoading(true);setError("");setMonth(value);}}/>
    {error?<Message text={error}/>:null}
    {loading?<Busy label="Calculating monthly bill…"/>:bill?<>
      <View style={styles.summary}>
        <Summary label="DELIVERED CHARGES" value={money(bill.totals.totalAmount)} tone="green"/>
        <Summary label="OPEN ESTIMATE" value={money(bill.totals.totalOutstandingEstimate)} tone="orange"/>
      </View>
      <Card><View style={styles.titleRow}><Text style={styles.cardTitle}>Scheduled items</Text><Text style={styles.count}>{bill.totals.scheduledCount}</Text></View><Text style={styles.helper}>Outstanding quantities remain estimates until delivered.</Text></Card>
      {bill.totals.unpricedLines>0?<Message type="info" text={`${bill.totals.unpricedLines} scheduled item(s) have no rate effective on their scheduled date.`}/>:null}
      {bill.products.length?bill.products.map(product=><BillProductCard key={product.productId} product={product}/>):
      <Card><Text style={styles.helper}>No scheduled product deliveries for {monthTitle(month)}.</Text></Card>}
    </>:null}
    <Pressable onPress={()=>{setLoading(true);void load();}} style={styles.refresh}><Text style={styles.refreshText}>Refresh bill</Text></Pressable>
  </Screen>;
}
function BillProductCard({product}:{product:MonthlyBill["products"][number]}){
  const [expanded,setExpanded]=useState(false);
  return <Card>
    <View style={styles.productHeader}><View style={styles.copy}><Text style={styles.productTitle}>{product.productName}</Text><Text style={styles.helper}>{product.deliveredQuantity} {product.unit} delivered · {product.outstandingQuantity} {product.unit} open</Text></View><Text style={styles.amount}>{money(product.deliveredAmount)}</Text></View>
    <View style={styles.bar}><View style={[styles.barFill,{width:((product.expectedQuantity?Math.min(100,product.deliveredQuantity/product.expectedQuantity*100):0)+"%") as DimensionValue}]}/></View>
    <Text style={styles.small}>{product.expectedQuantity} {product.unit} expected · estimate {money(product.outstandingAmount)}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(value=>!value)} style={styles.expand}><Text style={styles.link}>{expanded?"Hide":"View"} scheduled line details ({product.lines.length})</Text></Pressable>
    {expanded?<View style={styles.lines}>{product.lines.map((line,index)=><View key={line.scheduledDeliveryId||`${line.scheduledDate}-${line.timeSlot}-${index}`} style={styles.line}><View style={styles.productHeader}><Text style={styles.lineTitle}>{dateTitle(line.scheduledDate)} · {line.timeSlot}</Text><Text style={styles.lineStatus}>{line.status.replace("_"," ")}</Text></View><Text style={styles.helper}>Delivered {line.deliveredQuantity} / {line.expectedQuantity} {line.unit} · open {line.outstandingQuantity} {line.unit}</Text><Text style={styles.helper}>{line.rate===null?"No effective rate":`${money(line.rate)} / ${line.unit}`} · delivered {line.deliveredAmount===null?"unpriced":money(line.deliveredAmount)} · estimate {line.outstandingAmount===null?"unpriced":money(line.outstandingAmount)}</Text></View>)}</View>:null}
  </Card>;
}
function Summary({label,value,tone}:{label:string;value:string;tone:"green"|"orange"}) {
  return <View style={styles.summaryCard}><Text style={styles.summaryLabel}>{label}</Text><Text style={[styles.summaryValue,tone==="orange"&&{color:palette.orange}]}>{value}</Text></View>;
}
const styles=StyleSheet.create({
  summary:{flexDirection:"row",gap:10},summaryCard:{flex:1,minHeight:104,padding:14,borderRadius:14,borderWidth:1,borderColor:palette.line,backgroundColor:"white",justifyContent:"space-between"},summaryLabel:{fontSize:10,fontWeight:"800",letterSpacing:.5,color:palette.muted},summaryValue:{fontSize:20,fontWeight:"800",color:palette.green},titleRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},cardTitle:{fontSize:15,fontWeight:"800",color:palette.ink},count:{fontSize:17,fontWeight:"800",color:palette.blue},helper:{fontSize:12,lineHeight:17,color:palette.muted,marginTop:4},productHeader:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12},copy:{flex:1},productTitle:{fontSize:16,fontWeight:"800",color:palette.ink},amount:{fontSize:14,fontWeight:"800",color:palette.green},bar:{height:7,borderRadius:5,overflow:"hidden",backgroundColor:"#edf2ed",marginTop:15},barFill:{height:"100%",borderRadius:5,backgroundColor:"#65a375"},small:{fontSize:10,color:palette.muted,marginTop:6},expand:{minHeight:40,justifyContent:"center",alignSelf:"flex-start"},link:{fontSize:12,fontWeight:"700",color:palette.green},lines:{gap:8,paddingTop:10,borderTopWidth:1,borderTopColor:palette.line},line:{gap:3,paddingVertical:8},lineTitle:{fontSize:12,fontWeight:"800",color:palette.text,textTransform:"capitalize"},lineStatus:{fontSize:10,fontWeight:"700",color:palette.muted,textTransform:"capitalize"},refresh:{alignSelf:"center",minHeight:42,justifyContent:"center",paddingHorizontal:12},refreshText:{fontSize:13,fontWeight:"700",color:palette.green}
});
