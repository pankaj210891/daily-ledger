import { useCallback,useEffect,useState } from "react";
import { KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from "react-native";
import { router } from "expo-router";
import { DateField } from "@/components/DateField";
import { api,type Entry } from "@/lib/api";
import { dateTitle,money,todayKey } from "@/lib/dates";
import { palette } from "@/lib/theme";
import { ActionButton,Busy,Card,Message,PageHeading,Screen } from "@/components/ui";

export default function ExpensesScreen() {
  const [entries,setEntries]=useState<Entry[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<Entry|null>(null);
  const [name,setName]=useState("");
  const [category,setCategory]=useState("");
  const [amount,setAmount]=useState("");
  const [date,setDate]=useState(todayKey());
  const [notes,setNotes]=useState("");
  const [removeId,setRemoveId]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);
  const load=useCallback(async()=>{try{setEntries((await api.entries()).filter(entry=>entry.type==="expense"));}catch(reason){setError(reason instanceof Error?reason.message:"Unable to load expenses.");}finally{setLoading(false);}},[]);
  // The loader only commits state after its async API request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void load();},[load]);
  async function submit(){
    const value=Number(amount);
    if(!name.trim())return setError("Enter what the expense was for.");
    if(!Number.isFinite(value)||value<=0)return setError("Enter an amount greater than zero.");
    setSaving(true);setError("");
    try{if(editing)await api.updateEntry(editing._id,{name:name.trim(),category:category.trim(),amount:value,date,status:"recorded",notes});else await api.createEntry({type:"expense",name:name.trim(),category:category.trim(),amount:value,date,status:"recorded",notes});setName("");setCategory("");setAmount("");setDate(todayKey());setNotes("");setEditing(null);setOpen(false);await load();}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to save expense.");}
    finally{setSaving(false);}
  }
  function startEdit(entry:Entry){setEditing(entry);setName(entry.name);setCategory(entry.category||"");setAmount(String(entry.amount));setDate(entry.date.slice(0,10));setNotes(entry.notes||"");setError("");setOpen(true);}
  async function removeEntry(id:string){setSaving(true);setError("");try{await api.deleteEntry(id);setRemoveId(null);await load();}catch(reason){setError(reason instanceof Error?reason.message:"Unable to delete expense.");}finally{setSaving(false);}}
  function closeEditor(){setOpen(false);setEditing(null);setError("");}
  return <Screen><Text onPress={()=>router.back()} style={styles.back}>‹  More</Text><PageHeading eyebrow="FINANCES" title="Household expenses" subtitle="One-time manual expenses for your household."/>
    <Pressable onPress={()=>setOpen(true)} style={styles.add}><Text style={styles.addText}>＋ Add expense</Text></Pressable>
    {error?<Message text={error}/>:null}
    {loading?<Busy label="Loading expenses…"/>:entries.length?entries.map(entry=><Card key={entry._id}><View style={styles.row}><View style={styles.copy}><Text style={styles.name}>{entry.name}</Text><Text style={styles.meta}>{entry.category||"General"} · {dateTitle(entry.date.slice(0,10))}</Text>{entry.notes?<Text style={styles.meta}>{entry.notes}</Text>:null}</View><Text style={styles.amount}>{money(entry.amount)}</Text></View><View style={styles.rowActions}><Pressable onPress={()=>startEdit(entry)}><Text style={styles.link}>Edit</Text></Pressable>{removeId===entry._id?<View style={styles.confirm}><Text style={styles.meta}>Delete this expense?</Text><Pressable onPress={()=>setRemoveId(null)}><Text style={styles.link}>Keep</Text></Pressable><Pressable disabled={saving} onPress={()=>void removeEntry(entry._id)}><Text style={styles.delete}>Delete</Text></Pressable></View>:<Pressable onPress={()=>setRemoveId(entry._id)}><Text style={styles.delete}>Delete</Text></Pressable>}</View></Card>):<Card><Text style={styles.name}>No expenses recorded yet</Text><Text style={styles.meta}>Add an expense to start building your ledger.</Text></Card>}
    <Modal visible={open} transparent animationType="slide" onRequestClose={closeEditor}>
      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS==="ios"?"padding":"height"} keyboardVerticalOffset={Platform.OS==="ios"?12:0}>
        <View style={styles.shade}>
          <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS==="ios"?"interactive":"on-drag"}>
            <View style={styles.modal}>
              <View style={styles.modalHead}><Text style={styles.modalTitle}>{editing?"Edit expense":"Add expense"}</Text><Pressable accessibilityLabel="Close expense form" onPress={closeEditor} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>
              <View style={styles.fields}>
                <View style={styles.field}><Text style={styles.label}>What was it for?</Text><TextInput value={name} onChangeText={setName} placeholder="Expense name" returnKeyType="next" style={styles.input}/></View>
                <View style={styles.field}><Text style={styles.label}>Category (optional)</Text><TextInput value={category} onChangeText={setCategory} placeholder="General" returnKeyType="next" style={styles.input}/></View>
                <View style={styles.field}><Text style={styles.label}>Amount</Text><TextInput value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" style={styles.input}/></View>
                <DateField label="Payment date" value={date} onChange={setDate}/>
                <View style={styles.field}><Text style={styles.label}>Notes (optional)</Text><TextInput value={notes} onChangeText={setNotes} multiline style={[styles.input,styles.notes]}/></View>
              </View>
              {error?<Message text={error}/>:null}
              <ActionButton title={saving?"Saving…":editing?"Save changes":"Save expense"} onPress={()=>void submit()} disabled={saving}/>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </Screen>;
}
const styles=StyleSheet.create({
  back:{minHeight:38,textAlignVertical:"center",color:palette.green,fontSize:14,fontWeight:"700"},
  add:{minHeight:46,alignItems:"center",justifyContent:"center",borderRadius:11,backgroundColor:palette.green},
  addText:{fontSize:14,fontWeight:"700",color:"white"},
  row:{flexDirection:"row",justifyContent:"space-between",gap:10},
  copy:{flex:1,gap:4},
  name:{fontSize:15,fontWeight:"800",color:palette.ink},
  meta:{fontSize:11,color:palette.muted},
  amount:{fontSize:14,fontWeight:"800",color:palette.text},
  keyboardAvoider:{flex:1},
  shade:{flex:1,justifyContent:"flex-end",backgroundColor:"#17271d77"},
  sheetContent:{flexGrow:1,justifyContent:"flex-end",paddingTop:16,paddingBottom:12},
  modal:{gap:16,padding:22,paddingBottom:30,borderTopLeftRadius:20,borderTopRightRadius:20,backgroundColor:"white"},
  modalHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:2},
  modalTitle:{fontSize:21,fontWeight:"800",color:palette.ink},
  close:{width:42,height:42,borderRadius:10,alignItems:"center",justifyContent:"center",backgroundColor:palette.background},
  closeText:{fontSize:25,color:palette.muted},
  fields:{gap:14},
  field:{gap:7},
  label:{fontSize:13,fontWeight:"700",color:palette.text},
  input:{minHeight:52,borderWidth:1,borderColor:palette.line,borderRadius:10,paddingHorizontal:13,backgroundColor:"white",fontSize:16,color:palette.text},
  date:{fontSize:12,color:palette.muted},
  rowActions:{flexDirection:"row",gap:18,paddingTop:12,marginTop:12,borderTopWidth:1,borderTopColor:palette.line},
  link:{fontSize:12,fontWeight:"700",color:palette.green},
  delete:{fontSize:12,fontWeight:"700",color:palette.red},
  confirm:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:12},
  notes:{minHeight:86,paddingTop:12,textAlignVertical:"top"},
});
