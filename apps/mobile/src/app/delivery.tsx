import { useEffect,useState } from "react";
import { KeyboardAvoidingView,Platform,Pressable,StyleSheet,Text,TextInput,View } from "react-native";
import { router,useLocalSearchParams } from "expo-router";
import { DateField } from "@/components/DateField";
import { api,type ScheduledDelivery } from "@/lib/api";
import { dateTitle,monthBounds,todayKey } from "@/lib/dates";
import { palette } from "@/lib/theme";
import { ActionButton,Busy,Card,Message,Screen } from "@/components/ui";

export default function DeliveryDetailScreen() {
  const params=useLocalSearchParams<{id:string;month:string}>();
  const id=Array.isArray(params.id)?params.id[0]:params.id;
  const month=Array.isArray(params.month)?params.month[0]:params.month;
  const [item,setItem]=useState<ScheduledDelivery|null>(null);
  const [quantity,setQuantity]=useState("");
  const [date,setDate]=useState(todayKey());
  const [notes,setNotes]=useState("");
  const [editingPartId,setEditingPartId]=useState<string|null>(null);
  const [closeAction,setCloseAction]=useState<"zero-consumption"|"skip"|"cancel"|null>(null);
  const [closeReason,setCloseReason]=useState("");
  const [removePartId,setRemovePartId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{const bounds=monthBounds(month||todayKey().slice(0,7));const list=await api.deliveries(bounds.from,bounds.to);if(!cancelled)setItem(list.find(entry=>entry._id===id)||null);}
      catch(reason){if(!cancelled)setError(reason instanceof Error?reason.message:"Unable to load this delivery.");}
      finally{if(!cancelled)setLoading(false);}
    })();
    return()=>{cancelled=true;};
  },[id,month]);
  async function submit() {
    const amount=Number(quantity);
    if(!Number.isFinite(amount)||amount<=0)return setError("Enter a quantity greater than zero.");
    if(!item)return;
    setBusy(true);setError("");
    try{
      const updated=editingPartId
        ? await api.updateDeliveryPart(item._id,editingPartId,{quantity:amount,actualDate:date,notes})
        : await api.addDeliveryPart(item._id,{quantity:amount,actualDate:date,notes});
      if(editingPartId){setItem(updated);setEditingPartId(null);setQuantity("");setDate(todayKey());setNotes("");}
      else router.back();
    }
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to save delivery.");}
    finally{setBusy(false);}
  }
  function startCorrection(part:ScheduledDelivery["deliveryRecords"][number]){
    setEditingPartId(part._id);setQuantity(String(part.quantity));setDate(part.actualDate);setNotes(part.notes||"");setError("");
  }
  function cancelCorrection(){
    setEditingPartId(null);setQuantity("");setDate(todayKey());setNotes("");setError("");
  }
  async function closeDelivery(){
    if(!item||!closeAction)return;
    setBusy(true);setError("");
    try{const updated=await api.closeScheduledDelivery(item._id,closeAction,closeReason);setItem(updated);setCloseAction(null);setCloseReason("");}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to update delivery status.");}
    finally{setBusy(false);}
  }
  async function removePart(recordId:string){
    if(!item)return;
    setBusy(true);setError("");
    try{setItem(await api.deleteDeliveryPart(item._id,recordId));setRemovePartId(null);}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to remove delivery part.");}
    finally{setBusy(false);}
  }
  const open=item&&["pending","partially_delivered"].includes(item.status);
  return <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS==="ios"?"padding":"height"} keyboardVerticalOffset={Platform.OS==="ios"?12:0}><Screen>
    <Pressable onPress={()=>router.back()} style={styles.back}><Text style={styles.backText}>‹  Deliveries</Text></Pressable>
    {loading?<Busy label="Loading delivery…"/>:!item?<Message text={error||"Delivery not found. Refresh the schedule and try again."}/>:<>
      <View style={styles.heading}><Text style={styles.eyebrow}>SCHEDULED DELIVERY</Text><Text style={styles.title}>{item.productName}</Text><Text style={styles.subtitle}>{dateTitle(item.scheduledDate)} · {item.timeSlot}</Text></View>
      <Card><View style={styles.row}><Text style={styles.label}>Expected</Text><Text style={styles.value}>{item.expectedQuantity} {item.unit}</Text></View><View style={styles.row}><Text style={styles.label}>Delivered</Text><Text style={styles.value}>{item.deliveredQuantity} {item.unit}</Text></View><View style={styles.row}><Text style={styles.label}>Outstanding</Text><Text style={styles.value}>{open?Math.max(0,item.expectedQuantity-item.deliveredQuantity):0} {item.unit}</Text></View><View style={styles.row}><Text style={styles.label}>Status</Text><Text style={styles.status}>{item.status.replace("_"," ")}</Text></View></Card>
      {item.deliveryRecords.length>0?<Card><Text style={styles.sectionTitle}>Recorded delivery parts</Text><View style={correctionStyles.partsList}>{item.deliveryRecords.map(part=><View key={part._id} style={correctionStyles.partRow}><View style={correctionStyles.partCopy}><Text style={correctionStyles.partDate}>{dateTitle(part.actualDate)}</Text><Text style={styles.value}>{part.quantity} {item.unit}</Text>{part.notes?<Text style={correctionStyles.partNotes}>{part.notes}</Text>:null}{removePartId===part._id?<View style={correctionStyles.confirmRow}><Text style={correctionStyles.partNotes}>Remove this record and recalculate quantity?</Text><View style={correctionStyles.confirmButtons}><Pressable onPress={()=>setRemovePartId(null)}><Text style={correctionStyles.correctText}>Keep</Text></Pressable><Pressable disabled={busy} onPress={()=>void removePart(part._id)}><Text style={correctionStyles.removeText}>Remove</Text></Pressable></View></View>:null}</View><View style={correctionStyles.partActions}><Pressable accessibilityRole="button" onPress={()=>startCorrection(part)} style={correctionStyles.correctButton}><Text style={correctionStyles.correctText}>Correct</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>setRemovePartId(part._id)} style={correctionStyles.removeButton}><Text style={correctionStyles.removeText}>Remove</Text></Pressable></View></View>)}</View></Card>:null}
      {item.closeReason?<Message text={item.closeReason} type="info"/>:null}
      {open?<Card><Text style={styles.sectionTitle}>Close or skip this delivery</Text><Text style={styles.helper}>{item.deliveredQuantity>0?`${item.deliveredQuantity} ${item.unit} delivered; ${Math.max(0,item.expectedQuantity-item.deliveredQuantity)} ${item.unit} remains. Closing waives the outstanding quantity.`:"Record zero consumption, skip this schedule, or cancel it."}</Text>{closeAction?<View style={styles.formFields}><View style={styles.field}><Text style={styles.label}>Reason (optional)</Text><TextInput value={closeReason} onChangeText={setCloseReason} maxLength={500} multiline style={[styles.input,styles.notes]}/></View>{error?<Message text={error}/>:null}<ActionButton title={busy?"Saving…":closeAction==="zero-consumption"?"Record zero":closeAction==="skip"?"Skip delivery":"Cancel delivery"} onPress={()=>void closeDelivery()} disabled={busy}/><ActionButton title="Keep open" secondary onPress={()=>{setCloseAction(null);setCloseReason("");setError("");}}/></View>:<View style={correctionStyles.closeActions}>{item.status==="pending"&&item.deliveryRecords.length===0?<Pressable onPress={()=>setCloseAction("zero-consumption")} style={correctionStyles.closeButton}><Text style={correctionStyles.correctText}>Zero consumption</Text></Pressable>:null}<Pressable onPress={()=>setCloseAction("skip")} style={correctionStyles.closeButton}><Text style={correctionStyles.correctText}>Skip</Text></Pressable><Pressable onPress={()=>setCloseAction("cancel")} style={correctionStyles.removeButton}><Text style={correctionStyles.removeText}>Cancel</Text></Pressable></View>}</Card>:null}
      {open||editingPartId?<Card><Text style={styles.sectionTitle}>{editingPartId?"Correct a delivery part":"Record a delivery"}</Text><View style={styles.formFields}>
        <View style={styles.field}><Text style={styles.label}>Quantity delivered ({item.unit})</Text><TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder={"Up to "+Math.max(0,item.expectedQuantity-item.deliveredQuantity+(item.deliveryRecords.find(part=>part._id===editingPartId)?.quantity||0))+" "+item.unit} style={styles.input}/></View>
        <DateField label="Actual delivery date" value={date} onChange={setDate}/>
        <View style={styles.field}><Text style={styles.label}>Notes (optional)</Text><TextInput value={notes} onChangeText={setNotes} multiline style={[styles.input,styles.notes]}/></View>
        {error?<Message text={error}/>:null}{editingPartId?<ActionButton title="Cancel correction" secondary onPress={cancelCorrection}/>:null}<ActionButton title={busy?"Saving…":editingPartId?"Save correction":"Save delivery part"} onPress={()=>void submit()} disabled={busy}/>
      </View></Card>:null}
    </>}
  </Screen></KeyboardAvoidingView>;
}
const styles=StyleSheet.create({
  keyboard:{flex:1},back:{minHeight:44,justifyContent:"center",alignSelf:"flex-start",paddingRight:12},backText:{fontSize:14,fontWeight:"700",color:palette.green},heading:{gap:8,paddingVertical:8},eyebrow:{fontSize:10,fontWeight:"800",letterSpacing:1.3,color:palette.muted},title:{fontSize:29,fontWeight:"800",color:palette.ink},subtitle:{fontSize:14,lineHeight:20,color:palette.muted,textTransform:"capitalize"},row:{flexDirection:"row",justifyContent:"space-between",paddingVertical:10},label:{fontSize:13,fontWeight:"600",lineHeight:18,color:palette.muted},value:{fontSize:14,fontWeight:"700",color:palette.text},status:{fontSize:13,fontWeight:"700",color:palette.green,textTransform:"capitalize"},sectionTitle:{fontSize:17,fontWeight:"800",color:palette.ink,marginBottom:4},helper:{fontSize:12,lineHeight:18,color:palette.muted,marginBottom:10},partRow:{flexDirection:"row",justifyContent:"space-between",paddingVertical:11,borderTopWidth:1,borderTopColor:palette.line},formFields:{gap:16},field:{gap:7},input:{minHeight:52,borderWidth:1,borderColor:palette.line,borderRadius:11,paddingHorizontal:14,fontSize:16,color:palette.text,backgroundColor:"white"},notes:{minHeight:92,paddingTop:13,textAlignVertical:"top"}
});

const correctionStyles=StyleSheet.create({
  partsList:{gap:6},
  partRow:{flexDirection:"column",alignItems:"stretch",gap:9,paddingVertical:12,borderTopWidth:1,borderTopColor:palette.line},
  partCopy:{flex:1,gap:4},
  partDate:{fontSize:12,fontWeight:"700",color:palette.text},
  partNotes:{fontSize:12,lineHeight:17,color:palette.muted},
  correctButton:{flex:1,minHeight:42,minWidth:0,alignItems:"center",justifyContent:"center",paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:palette.line,backgroundColor:palette.greenSoft},
  correctText:{fontSize:13,fontWeight:"700",color:palette.green},
  partActions:{width:"100%",flexDirection:"row",alignItems:"center",gap:8},
  removeButton:{flex:1,minHeight:42,minWidth:0,alignItems:"center",justifyContent:"center",paddingHorizontal:10,borderRadius:10,borderWidth:1,borderColor:"#f1d4cc",backgroundColor:palette.redSoft},
  removeText:{fontSize:12,fontWeight:"700",color:palette.red},
  confirmRow:{gap:8,marginTop:6},
  confirmButtons:{flexDirection:"row",gap:18},
  closeActions:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:8},
  closeButton:{minHeight:40,alignItems:"center",justifyContent:"center",paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:palette.line,backgroundColor:palette.greenSoft},
});
