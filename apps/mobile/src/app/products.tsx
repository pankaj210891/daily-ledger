import { useCallback,useEffect,useState } from "react";
import { KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from "react-native";
import { router } from "expo-router";
import { DateField } from "@/components/DateField";
import { api,type Product,type ProductSchedule,type ProductScheduleFrequency,type ProductTimeSlot } from "@/lib/api";
import { dateTitle,money,todayKey } from "@/lib/dates";
import { palette } from "@/lib/theme";
import { ActionButton,Busy,Card,Message,PageHeading,Screen } from "@/components/ui";

const slots:ProductTimeSlot[]=["morning","afternoon","evening","night"];
const productUnits=["litre","ml","kg","gram","packet","piece","dozen"];
const weekdays=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const today=todayKey;
function freshSchedule(timeSlot:ProductTimeSlot):ProductSchedule{return {timeSlot,frequency:"daily",weekdays:[],startsOn:today(),expectedQuantity:1};}

export default function ProductsScreen() {
  const [items,setItems]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [editing,setEditing]=useState<Product|null|undefined>(undefined);
  const [rateProduct,setRateProduct]=useState<Product|null>(null);
  const load=useCallback(async()=>{
    setError("");
    try{setItems(await api.products());}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to load products.");}
    finally{setLoading(false);}
  },[]);
  // Load data from the API after the screen mounts.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void load();},[load]);
  async function saveAndRefresh(){await load();}
  async function toggleActive(product:Product){
    setError("");
    try{await api.updateProduct(product._id,{isActive:!product.isActive});await load();}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to update product status.");}
  }
  return <Screen>
    <Text onPress={()=>router.back()} style={styles.back}>‹  More</Text>
    <PageHeading eyebrow="DAILY OPERATIONS" title="Products & rates" subtitle="Manage household products, delivery schedules, and rate history."/>
    {error?<Message text={error}/>:null}
    <Pressable accessibilityRole="button" onPress={()=>setEditing(null)} style={styles.addProduct}><View style={styles.addIcon}><Text style={styles.addIconText}>+</Text></View><Text style={styles.addProductText}>Add product</Text></Pressable>
    {loading?<Busy label="Loading products…"/>:items.length?items.map(product=><ProductCard key={product._id} product={product} onEdit={()=>setEditing(product)} onRate={()=>setRateProduct(product)} onToggle={()=>void toggleActive(product)}/>):<Card><Text style={styles.name}>No products yet</Text><Text style={styles.detail}>Add a product to configure its rate and delivery schedule.</Text></Card>}
    {editing!==undefined?<ProductEditor product={editing} onClose={()=>setEditing(undefined)} onSaved={saveAndRefresh}/>:null}
    {rateProduct?<RateEditor product={rateProduct} onClose={()=>setRateProduct(null)} onSaved={saveAndRefresh}/>:null}
  </Screen>;
}

function ProductCard({product,onEdit,onRate,onToggle}:{product:Product;onEdit:()=>void;onRate:()=>void;onToggle:()=>void}){
  const [showHistory,setShowHistory]=useState(false);
  return <Card>
    <View style={styles.cardHead}><View style={styles.productCopy}><Text style={styles.name}>{product.name}</Text><Text style={styles.detail}>{product.isActive?"Active":"Archived"} · {product.unit}</Text></View><Text style={styles.rate}>{product.currentRate===null?"No rate":money(product.currentRate)+" / "+product.unit}</Text></View>
    <View style={styles.scheduleList}>{product.schedules.length?product.schedules.map((schedule,index)=><View key={schedule._id||schedule.timeSlot+index} style={styles.scheduleLine}><Text style={styles.detail}>{schedule.timeSlot} · {schedule.frequency.replace(/_/g," ")}</Text><Text style={styles.quantity}>{schedule.expectedQuantity} {product.unit}</Text><Text style={styles.detail}>From {dateTitle(schedule.startsOn)}{schedule.endsOn?` · until ${dateTitle(schedule.endsOn)}`:" · no end date"}</Text></View>):<Text style={styles.detail}>No delivery schedule configured</Text>}</View>
    <Pressable onPress={()=>setShowHistory(value=>!value)} style={styles.historyToggle}><Text style={styles.link}>{showHistory?"Hide":"View"} rate history ({product.rates?.length||0})</Text></Pressable>
    {showHistory?(product.rates?.length?<View style={styles.history}>{[...product.rates].sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom)).map(rate=><View key={rate._id} style={styles.historyRow}><Text style={styles.detail}>From {dateTitle(rate.effectiveFrom)}</Text><Text style={styles.quantity}>{money(rate.amount)} / {product.unit}</Text></View>)}</View>:<Text style={styles.detail}>No rate history available.</Text>):null}
    <View style={styles.actions}><Pressable onPress={onEdit} style={styles.secondaryButton}><Text style={styles.secondaryText}>Edit</Text></Pressable><Pressable onPress={onRate} style={styles.secondaryButton}><Text style={styles.secondaryText}>Add rate</Text></Pressable><Pressable onPress={onToggle} style={styles.secondaryButton}><Text style={styles.secondaryText}>{product.isActive?"Archive":"Restore"}</Text></Pressable></View>
  </Card>;
}

function ProductEditor({product,onClose,onSaved}:{product:Product|null;onClose:()=>void;onSaved:()=>Promise<void>}){
  const [name,setName]=useState(product?.name||"");
  const [unit,setUnit]=useState(product?.unit||"");
  const [customUnit,setCustomUnit]=useState(Boolean(product?.unit&&!productUnits.includes(product.unit)));
  const [unitPickerOpen,setUnitPickerOpen]=useState(false);
  const [rate,setRate]=useState("");
  const [schedules,setSchedules]=useState<ProductSchedule[]>(product?.schedules||[]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  function changeSchedule(slot:ProductTimeSlot,patch:Partial<ProductSchedule>){setSchedules(current=>current.map(schedule=>schedule.timeSlot===slot?{...schedule,...patch}:schedule));}
  function toggleSlot(slot:ProductTimeSlot,enabled:boolean){setSchedules(current=>enabled?[...current,freshSchedule(slot)].sort((a,b)=>slots.indexOf(a.timeSlot)-slots.indexOf(b.timeSlot)):current.filter(schedule=>schedule.timeSlot!==slot));}
  async function submit(){
    setError("");
    if(name.trim().length<1)return setError("Enter a product name.");
    if(unit.trim().length<1)return setError("Enter a unit, such as litre or kg.");
    if(!product&&(!Number.isFinite(Number(rate))||rate.trim()===""||Number(rate)<0))return setError("Enter a valid starting rate.");
    if(schedules.some(schedule=>!/^\d{4}-\d{2}-\d{2}$/.test(schedule.startsOn)||Boolean(schedule.endsOn&&schedule.endsOn<schedule.startsOn)))return setError("Check the schedule start and end dates.");
    if(schedules.some(schedule=>schedule.expectedQuantity<=0||!Number.isFinite(schedule.expectedQuantity)))return setError("Expected quantity must be greater than zero.");
    if(schedules.some(schedule=>schedule.frequency==="selected_weekdays"&&!schedule.weekdays.length))return setError("Select at least one weekday for each selected-weekday schedule.");
    if(schedules.some(schedule=>schedule.frequency==="every_x_days"&&(!schedule.everyDays||schedule.everyDays<1||schedule.everyDays>365)))return setError("Repeat interval must be between 1 and 365 days.");
    setBusy(true);
    const scheduleInputs=schedules.map(({_id,...schedule})=>({...schedule,weekdays:schedule.frequency==="selected_weekdays"?schedule.weekdays:[],everyDays:schedule.frequency==="every_x_days"?schedule.everyDays:undefined,anchorDate:schedule.frequency==="every_x_days"?(schedule.anchorDate||schedule.startsOn):undefined}));
    try{
      if(product)await api.updateProduct(product._id,{name:name.trim(),unit:unit.trim(),schedules:scheduleInputs});
      else await api.createProduct({name:name.trim(),unit:unit.trim(),rate:Number(rate),rateEffectiveFrom:schedules.map(schedule=>schedule.startsOn).sort()[0]||today(),schedules:scheduleInputs});
      await onSaved();onClose();
    }catch(reason){setError(reason instanceof Error?reason.message:"Unable to save product.");}
    finally{setBusy(false);}
  }
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.modalShade} behavior={Platform.OS==="ios"?"padding":"height"}>
      <View style={styles.modal}><View style={styles.modalHeader}><View style={styles.productCopy}><Text style={styles.eyebrow}>{product?"EDIT PRODUCT":"NEW PRODUCT"}</Text><Text style={styles.modalTitle}>{product?"Product details":"Add a product"}</Text></View><Pressable accessibilityLabel="Close" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <Field label="Product name" value={name} onChangeText={setName} placeholder="e.g. Milk"/>
          <UnitField value={unit} custom={customUnit} onPress={()=>setUnitPickerOpen(true)} onCustomChange={setUnit}/>
          {!product?<Field label="Starting rate (₹)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="0.00"/>:<Text style={styles.helper}>Rate history is managed separately. Existing scheduled dates retain their original rate.</Text>}
          <Text style={styles.sectionTitle}>Delivery schedule</Text><Text style={styles.helper}>Expected quantity is configured separately for each time slot.</Text>
          {slots.map(slot=>{
            const schedule=schedules.find(item=>item.timeSlot===slot);
            return <View key={slot} style={styles.slotEditor}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{checked:Boolean(schedule)}} onPress={()=>toggleSlot(slot,!schedule)} style={styles.slotToggle}><View style={[styles.checkBox,schedule&&styles.checked]}><Text style={[styles.checkGlyph,schedule&&styles.checkGlyphActive]}>{schedule?"✓":"+"}</Text></View><Text style={styles.slotTitle}>{slot[0].toUpperCase()+slot.slice(1)}</Text></Pressable>
              {schedule?<View style={styles.slotFields}>
                <Text style={styles.label}>Pattern</Text><View style={styles.choiceRow}>{(["daily","selected_weekdays","every_x_days"] as ProductScheduleFrequency[]).map(frequency=><Choice key={frequency} label={frequency==="selected_weekdays"?"Weekdays":frequency==="every_x_days"?"Every X days":"Daily"} active={schedule.frequency===frequency} onPress={()=>changeSchedule(slot,{frequency,weekdays:frequency==="selected_weekdays"?(schedule.weekdays.length?schedule.weekdays:[1,2,3,4,5]):[]})}/>)}</View>
                <Field label={`Expected quantity (${unit||"unit"})`} value={String(schedule.expectedQuantity)} onChangeText={value=>changeSchedule(slot,{expectedQuantity:Number(value)})} keyboardType="decimal-pad"/>
                {schedule.frequency==="selected_weekdays"?<><Text style={styles.label}>Repeat on</Text><View style={styles.choiceRow}>{weekdays.map((day,index)=><Choice key={day} label={day} active={schedule.weekdays.includes(index)} onPress={()=>changeSchedule(slot,{weekdays:schedule.weekdays.includes(index)?schedule.weekdays.filter(value=>value!==index):[...schedule.weekdays,index].sort()})}/>)}</View></>:null}
                {schedule.frequency==="every_x_days"?<><Field label="Repeat every (days)" value={String(schedule.everyDays||2)} onChangeText={value=>changeSchedule(slot,{everyDays:Number(value)})} keyboardType="number-pad"/><DateField label="Cycle anchor date" value={schedule.anchorDate||schedule.startsOn} onChange={value=>changeSchedule(slot,{anchorDate:value})}/></>:null}
                <DateField label="Starts on" value={schedule.startsOn} onChange={value=>changeSchedule(slot,{startsOn:value,...(schedule.frequency==="every_x_days"&&(!schedule.anchorDate||schedule.anchorDate===schedule.startsOn)?{anchorDate:value}:{})})}/>
                <DateField label="Ends on (optional)" value={schedule.endsOn||""} optional minimumDate={schedule.startsOn} onChange={value=>changeSchedule(slot,{endsOn:value||undefined})}/>
              </View>:null}
            </View>;
          })}
          {error?<Message text={error}/>:null}
          <ActionButton title={busy?"Saving…":product?"Save product":"Create product"} disabled={busy} onPress={()=>void submit()}/>
          <ActionButton title="Cancel" secondary onPress={onClose}/>
        </ScrollView>
        {unitPickerOpen?<View style={styles.unitPickerOverlay}><Pressable accessibilityRole="button" accessibilityLabel="Close unit options" onPress={()=>setUnitPickerOpen(false)} style={StyleSheet.absoluteFill}/><View style={styles.unitPickerSheet}><Text style={styles.unitPickerTitle}>Choose a unit</Text><ScrollView style={styles.dropdownOptions} nestedScrollEnabled keyboardShouldPersistTaps="handled">{productUnits.map(option=><Pressable key={option} onPress={()=>{setUnit(option);setCustomUnit(false);setUnitPickerOpen(false);}} style={styles.dropdownOption}><Text style={styles.dropdownOptionText}>{option}</Text></Pressable>)}<Pressable onPress={()=>{setUnit("");setCustomUnit(true);setUnitPickerOpen(false);}} style={styles.dropdownOption}><Text style={styles.dropdownOptionText}>Other…</Text></Pressable></ScrollView><ActionButton title="Close" secondary onPress={()=>setUnitPickerOpen(false)}/></View></View>:null}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

function RateEditor({product,onClose,onSaved}:{product:Product;onClose:()=>void;onSaved:()=>Promise<void>}){
  const [amount,setAmount]=useState("");
  const [effectiveFrom,setEffectiveFrom]=useState(today());
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(){
    if(!amount.trim()||!Number.isFinite(Number(amount))||Number(amount)<0)return setError("Enter a valid rate.");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)||effectiveFrom<today())return setError("Rate effective date must be today or a future date in YYYY-MM-DD format.");
    setBusy(true);setError("");
    try{await api.addProductRate(product._id,{amount:Number(amount),effectiveFrom});await onSaved();onClose();}
    catch(reason){setError(reason instanceof Error?reason.message:"Unable to add rate.");}
    finally{setBusy(false);}
  }
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView style={styles.modalShade} behavior={Platform.OS==="ios"?"padding":"height"}><View style={styles.modal}><View style={styles.modalHeader}><View><Text style={styles.eyebrow}>RATE HISTORY</Text><Text style={styles.modalTitle}>Change {product.name} rate</Text></View><Pressable accessibilityLabel="Close" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}><Field label={`New rate (₹ per ${product.unit})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00"/><DateField label="Effective from" value={effectiveFrom} onChange={setEffectiveFrom} minimumDate={today()}/><Text style={styles.helper}>Rates take effect today or later. Existing scheduled dates keep the rate applicable to their scheduled date.</Text>{error?<Message text={error}/>:null}<ActionButton title={busy?"Saving…":"Add rate"} disabled={busy} onPress={()=>void submit()}/><ActionButton title="Cancel" secondary onPress={onClose}/></ScrollView></View></KeyboardAvoidingView></Modal>;
}

function Field({label,value,onChangeText,placeholder,keyboardType}:{label:string;value:string;onChangeText:(value:string)=>void;placeholder?:string;keyboardType?:"decimal-pad"|"number-pad"}){return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} style={styles.input}/></View>;}
function UnitField({value,custom,onPress,onCustomChange}:{value:string;custom:boolean;onPress:()=>void;onCustomChange:(value:string)=>void}){const label=custom?(value?`Other · ${value}`:"Other · enter a unit"):value||"Select a unit";return <View style={styles.field}><Text style={styles.label}>Unit</Text><Pressable accessibilityRole="button" onPress={onPress} style={styles.dropdownButton}><Text style={[styles.dropdownText,!value&&styles.dropdownPlaceholder]}>{label}</Text><Text style={styles.dropdownArrow}>⌄</Text></Pressable>{custom?<TextInput value={value} onChangeText={onCustomChange} maxLength={30} placeholder="Enter a unit" style={styles.input}/>:null}</View>;}
function Choice({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={[styles.choice,active&&styles.choiceActive]}><Text style={[styles.choiceText,active&&styles.choiceTextActive]}>{label}</Text></Pressable>;}

const styles=StyleSheet.create({
  back:{minHeight:38,textAlignVertical:"center",color:palette.green,fontSize:14,fontWeight:"700"},addProduct:{height:52,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:9,borderRadius:11,backgroundColor:palette.green},addIcon:{width:25,height:25,alignItems:"center",justifyContent:"center",borderRadius:13,backgroundColor:"#ffffff28"},addIconText:{fontSize:22,lineHeight:24,fontWeight:"600",color:"white",textAlign:"center",includeFontPadding:false},addProductText:{fontSize:14,fontWeight:"700",color:"white"},cardHead:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:8},productCopy:{flex:1,gap:4},name:{fontSize:16,fontWeight:"800",color:palette.ink},detail:{fontSize:12,lineHeight:18,color:palette.muted,textTransform:"capitalize"},rate:{fontSize:12,fontWeight:"800",color:palette.green,textAlign:"right",maxWidth:145},scheduleList:{gap:10,marginTop:14,paddingTop:12,borderTopWidth:1,borderTopColor:palette.line},scheduleLine:{gap:4},quantity:{fontSize:13,fontWeight:"700",color:palette.text},historyToggle:{minHeight:42,justifyContent:"center"},link:{fontSize:13,fontWeight:"700",color:palette.green},history:{gap:8,padding:10,borderRadius:10,backgroundColor:palette.background},historyRow:{flexDirection:"row",justifyContent:"space-between",gap:8},actions:{flexDirection:"row",flexWrap:"wrap",gap:8,paddingTop:10,borderTopWidth:1,borderTopColor:palette.line},secondaryButton:{minHeight:40,justifyContent:"center",paddingHorizontal:13,borderRadius:9,borderWidth:1,borderColor:palette.line,backgroundColor:"white"},secondaryText:{fontSize:12,fontWeight:"700",color:palette.green},modalShade:{flex:1,justifyContent:"flex-end",backgroundColor:"#17271d77"},modal:{position:"relative",maxHeight:"94%",padding:20,paddingBottom:28,backgroundColor:"white",borderTopLeftRadius:20,borderTopRightRadius:20},modalHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:12},eyebrow:{fontSize:10,fontWeight:"800",letterSpacing:1.2,color:palette.muted},modalTitle:{fontSize:21,fontWeight:"800",color:palette.ink,marginTop:5},close:{width:38,height:38,borderRadius:10,alignItems:"center",justifyContent:"center",backgroundColor:palette.background},closeText:{fontSize:26,color:palette.muted},form:{gap:13,paddingBottom:10},field:{gap:6},label:{fontSize:12,fontWeight:"700",color:palette.text},input:{minHeight:48,borderWidth:1,borderColor:palette.line,borderRadius:10,paddingHorizontal:12,fontSize:16,color:palette.text,backgroundColor:"white"},dropdownButton:{minHeight:48,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:12,borderWidth:1,borderColor:palette.line,borderRadius:10,backgroundColor:"white"},dropdownText:{fontSize:15,color:palette.text,textTransform:"capitalize"},dropdownPlaceholder:{color:palette.muted},dropdownArrow:{fontSize:18,color:palette.green},dropdownOptions:{maxHeight:250,borderWidth:1,borderColor:palette.line,borderRadius:10,overflow:"hidden",backgroundColor:"white"},dropdownOption:{minHeight:46,justifyContent:"center",paddingHorizontal:13,borderBottomWidth:1,borderBottomColor:palette.line},dropdownOptionText:{fontSize:14,color:palette.text,textTransform:"capitalize"},unitPickerOverlay:{...StyleSheet.absoluteFill,justifyContent:"flex-end",backgroundColor:"#17271d77",zIndex:20},unitPickerSheet:{maxHeight:"80%",gap:12,padding:20,paddingBottom:24,borderTopLeftRadius:20,borderTopRightRadius:20,backgroundColor:"white"},unitPickerTitle:{fontSize:18,fontWeight:"800",color:palette.ink},helper:{fontSize:12,lineHeight:18,color:palette.muted},sectionTitle:{fontSize:16,fontWeight:"800",color:palette.ink,marginTop:4},slotEditor:{padding:12,borderWidth:1,borderColor:palette.line,borderRadius:12,gap:10},slotToggle:{flexDirection:"row",alignItems:"center",gap:9,minHeight:40},checkBox:{width:25,height:25,borderWidth:1,borderColor:palette.line,borderRadius:7,alignItems:"center",justifyContent:"center",backgroundColor:"white"},checkGlyph:{fontSize:19,lineHeight:22,fontWeight:"600",color:palette.muted,textAlign:"center",includeFontPadding:false},checked:{backgroundColor:palette.green,borderColor:palette.green},checkGlyphActive:{color:"white",fontSize:15,lineHeight:19},slotTitle:{fontSize:14,fontWeight:"800",color:palette.ink,textTransform:"capitalize"},slotFields:{gap:10,paddingTop:8,borderTopWidth:1,borderTopColor:palette.line},choiceRow:{flexDirection:"row",flexWrap:"wrap",gap:6},choice:{minHeight:34,justifyContent:"center",paddingHorizontal:10,borderRadius:9,borderWidth:1,borderColor:palette.line,backgroundColor:"white"},choiceActive:{borderColor:palette.green,backgroundColor:palette.greenSoft},choiceText:{fontSize:11,fontWeight:"700",color:palette.text},choiceTextActive:{color:palette.green}
});
