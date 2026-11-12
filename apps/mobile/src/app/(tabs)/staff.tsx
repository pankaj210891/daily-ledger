import { useCallback,useEffect,useMemo,useState } from "react";
import { KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from "react-native";
import { api,type AttendanceRecord,type AttendanceStatus,type HouseholdHoliday,type SalaryCalculation,type StaffMember } from "@/lib/api";
import { DateField } from "@/components/DateField";
import { dateTitle,monthKey,todayKey } from "@/lib/dates";
import { palette } from "@/lib/theme";
import { ActionButton,Busy,Card,Message,MonthPicker,PageHeading,Screen } from "@/components/ui";

const week=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const attendanceChoices:AttendanceStatus[]=["present","absent","pto","lop","weekly_off","holiday"];
const attendanceLabel=(status:string)=>status.toLowerCase()==="pto"?"PTO":status.toLowerCase()==="lop"?"LOP":status.replace("_"," ");
const selectedToday=todayKey();
const defaultDate=selectedToday;

export default function StaffScreen(){
  const [month,setMonth]=useState(monthKey());
  const [date,setDate]=useState(defaultDate);
  const [staff,setStaff]=useState<StaffMember[]>([]);
  const [attendance,setAttendance]=useState<AttendanceRecord[]>([]);
  const [holidays,setHolidays]=useState<HouseholdHoliday[]>([]);
  const [salaries,setSalaries]=useState<SalaryCalculation[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState("");
  const [error,setError]=useState("");
  const [pendingLeave,setPendingLeave]=useState<{staffId:string;status:AttendanceStatus}|null>(null);
  const [editing,setEditing]=useState<StaffMember|null|undefined>(undefined);
  const [revising,setRevising]=useState<StaffMember|null>(null);
  const [reasonFor,setReasonFor]=useState("");
  const [holidayDate,setHolidayDate]=useState(`${month}-01`);
  const [holidayName,setHolidayName]=useState("");
  const [holidayBusy,setHolidayBusy]=useState(false);
  const load=useCallback(async()=>{
    setError("");
    try{const [members,records,statements,holidayRows]=await Promise.all([api.staff(),api.attendance(month),api.salaries(month),api.holidays(month)]);setStaff(members);setAttendance(records);setSalaries(statements);setHolidays(holidayRows);}
    catch(issue){setError(issue instanceof Error?issue.message:"Unable to load staff and attendance.");}
    finally{setLoading(false);}
  },[month]);
  // API requests load the selected month after the screen is rendered.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void load();},[load]);
  const employed=staff.filter(member=>member.joinDate<=date&&(!member.endDate||member.endDate>=date));
  const holidayMap=useMemo(()=>new Map(holidays.map(item=>[item.date,item])),[holidays]);
  function effectiveStatus(member:StaffMember){
    const record=attendance.find(item=>item.staffId===member._id&&item.date===date);
    if(record)return record.status;
    if(holidayMap.has(date))return "holiday";
    const weekday=new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const weeklyPolicy=[...(member.weeklyOffHistory||[])].filter(policy=>policy.effectiveFrom<=date).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
    if((weeklyPolicy?.days||member.weeklyOffDays||[]).includes(weekday))return "weekly_off";
    return date>selectedToday?"pending":"present";
  }
  async function mark(member:StaffMember,status:AttendanceStatus){
    if(["pto","lop"].includes(status)&&(!reasonFor.trim()||pendingLeave?.staffId!==member._id||pendingLeave.status!==status)){setPendingLeave({staffId:member._id,status});setReasonFor("");setError("");return;}
    if(!["pto","lop"].includes(status)){setPendingLeave(null);setReasonFor("");}
    setSaving(member._id);setError("");
    try{await api.saveAttendance({staffId:member._id,date,status,...(["pto","lop"].includes(status)?{reason:reasonFor.trim()}:{})});setReasonFor("");setPendingLeave(null);await load();}
    catch(issue){setError(issue instanceof Error?issue.message:"Unable to save attendance.");}
    finally{setSaving("");}
  }
  async function reset(record:AttendanceRecord){setSaving(record.staffId);setError("");try{await api.deleteAttendance(record._id);await load();}catch(issue){setError(issue instanceof Error?issue.message:"Unable to reset attendance.");}finally{setSaving("");}}
  async function endEmployment(member:StaffMember){setSaving(member._id);setError("");try{await api.updateStaff(member._id,{isActive:false,endDate:selectedToday});await load();}catch(issue){setError(issue instanceof Error?issue.message:"Unable to update staff profile.");}finally{setSaving("");}}
  async function restoreEmployment(member:StaffMember){setSaving(member._id);setError("");try{await api.updateStaff(member._id,{isActive:true,endDate:null});await load();}catch(issue){setError(issue instanceof Error?issue.message:"Unable to restore staff profile.");}finally{setSaving("");}}
  async function saveHoliday(){if(!/^\d{4}-\d{2}-\d{2}$/.test(holidayDate)||holidayDate.slice(0,7)!==month)return setError("Choose a valid holiday date within the selected month.");if(!holidayName.trim())return setError("Enter a holiday name.");setHolidayBusy(true);setError("");try{await api.saveHoliday({date:holidayDate,name:holidayName.trim()});setHolidayName("");await load();}catch(issue){setError(issue instanceof Error?issue.message:"Unable to save holiday.");}finally{setHolidayBusy(false);}}
  async function removeHoliday(item:HouseholdHoliday){setHolidayBusy(true);setError("");try{await api.deleteHoliday(item._id);await load();}catch(issue){setError(issue instanceof Error?issue.message:"Unable to remove holiday.");}finally{setHolidayBusy(false);}}
  return <Screen>
    <PageHeading eyebrow="DAILY OPERATIONS" title="Staff & attendance" subtitle="Manage staff profiles, attendance, household holidays, and salary inputs."/>
    {error?<Message text={error}/>:null}
    <View style={styles.actions}><Text style={styles.sectionTitle}>Staff profiles</Text><Pressable onPress={()=>setEditing(null)} style={styles.add}><Text style={styles.addText}>＋ Add staff</Text></Pressable></View>
    {loading?<Busy label="Loading staff and attendance…"/>:staff.length?staff.map(member=><Card key={member._id} style={styles.staffCard}>
      <View style={styles.memberHeader}><View style={styles.copy}><Text style={styles.name}>{member.name}</Text><Text style={styles.salary}>{member.isActive?"Active":"Inactive"} · joined {dateTitle(member.joinDate)}{member.endDate?` · ended ${dateTitle(member.endDate)}`:""}</Text><Text style={styles.salary}>{member.currentMonthlySalary===null?"No salary set":"Monthly salary ₹"+member.currentMonthlySalary.toLocaleString("en-IN")}</Text><Text style={styles.sourceLine}>{member.weeklyOffDays.length?`${member.weeklyOffDays.map(day=>week[day]).join(", ")} · ${member.weeklyOffPaid?"paid":"unpaid"} weekly offs`:"No weekly off configured"}</Text></View></View>
      <View style={styles.profileActions}><SmallButton title="Edit profile" onPress={()=>setEditing(member)}/><SmallButton title="Revise salary" onPress={()=>setRevising(member)} disabled={!member.isActive}/><SmallButton title={member.isActive?"End employment":"Restore"} onPress={()=>void(member.isActive?endEmployment(member):restoreEmployment(member))} disabled={saving===member._id}/></View>
      {member.salaryHistory?.length?<Text style={styles.sourceLine}>Salary history: {[...member.salaryHistory].sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom)).map(item=>`${dateTitle(item.effectiveFrom)} · ₹${item.amount.toLocaleString("en-IN")}`).join("  |  ")}</Text>:null}
    </Card>):<Card><Text style={styles.name}>No staff profiles yet</Text><Text style={styles.sourceLine}>Add a staff member to begin attendance tracking.</Text></Card>}

    <Card style={styles.sectionCard}><Text style={styles.sectionTitle}>Attendance</Text><Text style={styles.helper}>Past unmarked dates default to present. Future dates stay pending.</Text><MonthPicker month={month} onChange={value=>{setMonth(value);setDate(`${value}-01`);setHolidayDate(`${value}-01`);}}/><DateField label="Attendance date" value={date} onChange={value=>{setDate(value);if(value&&value.slice(0,7)!==month){setMonth(value.slice(0,7));setHolidayDate(`${value.slice(0,7)}-01`);}}}/>
      {!/^\d{4}-\d{2}-\d{2}$/.test(date)||date.slice(0,7)!==month?<Text style={styles.errorText}>Enter a date in {month}.</Text>:employed.length?employed.map(member=>{
        const record=attendance.find(item=>item.staffId===member._id&&item.date===date);
        const status=effectiveStatus(member);
        return <View key={member._id} style={styles.attendanceCard}><View style={styles.attendanceHead}><Text style={styles.name}>{member.name}</Text><Text style={[styles.status, status==="pto"||status==="lop"?styles.statusAcronym:null, status==="absent"||status==="lop"?styles.statusAbsent:status==="pending"?styles.statusPending:styles.statusPresent]}>{attendanceLabel(status)}{record?" · recorded":" · default"}</Text></View>
          {status==="pto"||status==="lop"?<Text style={styles.sourceLine}>Reason: {record?.reason||"—"}</Text>:null}
          <View style={styles.statusChoices}>{attendanceChoices.map(choice=><SmallButton key={choice} title={attendanceLabel(choice)} active={status===choice||pendingLeave?.staffId===member._id&&pendingLeave.status===choice} onPress={()=>void mark(member,choice)} disabled={saving===member._id}/>)}</View>
          {pendingLeave?.staffId===member._id?<View style={styles.leaveForm}><Text style={styles.label}>{pendingLeave.status.toUpperCase()} reason (required)</Text><TextInput value={reasonFor} onChangeText={setReasonFor} maxLength={500} placeholder="Personal, illness…" style={styles.input}/><ActionButton title={saving===member._id?"Saving…":`Save ${pendingLeave.status.toUpperCase()} attendance`} disabled={saving===member._id||!reasonFor.trim()} onPress={()=>void mark(member,pendingLeave.status)}/></View>:null}
          {record&&<Pressable onPress={()=>void reset(record)} style={styles.reset}><Text style={styles.link}>Reset to default</Text></Pressable>}
        </View>;
      }):<Text style={styles.sourceLine}>No staff employed on this date.</Text>}
    </Card>

    <Card style={styles.sectionCard}><Text style={styles.sectionTitle}>Household holiday calendar</Text><Text style={styles.helper}>Listed holidays are paid by default unless attendance is explicitly overridden.</Text><MonthPicker month={month} onChange={value=>{setMonth(value);setDate(`${value}-01`);setHolidayDate(`${value}-01`);}}/><DateField label="Holiday date" value={holidayDate} onChange={setHolidayDate} minimumDate={`${month}-01`} maximumDate={`${month}-${String(new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate()).padStart(2,"0")}`}/><View style={styles.field}><Text style={styles.label}>Holiday name</Text><TextInput value={holidayName} onChangeText={setHolidayName} placeholder="e.g. Diwali" style={styles.input}/></View><ActionButton title={holidayBusy?"Saving…":"Add holiday"} disabled={holidayBusy} onPress={()=>void saveHoliday()}/>{holidays.length?holidays.map(item=><View key={item._id} style={styles.holidayRow}><Text style={styles.sourceLine}>{dateTitle(item.date)} · {item.name}</Text><Pressable disabled={holidayBusy} onPress={()=>void removeHoliday(item)}><Text style={styles.removeText}>Remove</Text></Pressable></View>):<Text style={styles.sourceLine}>No holidays for {month}.</Text>}</Card>

    <Card style={styles.sectionCard}><Text style={styles.sectionTitle}>Salary estimate · {month}</Text>{salaries.map(line=><View key={line.staffId} style={styles.salaryLine}><View style={styles.copy}><Text style={styles.name}>{line.staffName}</Text><Text style={styles.sourceLine}>Gross ₹{line.grossSalary.toLocaleString("en-IN")} · deductions ₹{line.deductions.toLocaleString("en-IN")}</Text></View><Text style={styles.salary}>{"₹"+line.netPayable.toLocaleString("en-IN")}</Text></View>)}<Text style={styles.helper}>Open Salary management from More for the daily breakdown.</Text></Card>

    {editing!==undefined?<StaffEditor staff={editing} onClose={()=>setEditing(undefined)} onSaved={load}/>:null}
    {revising?<SalaryEditor staff={revising} onClose={()=>setRevising(null)} onSaved={load}/>:null}
  </Screen>;
}

function StaffEditor({staff,onClose,onSaved}:{staff:StaffMember|null;onClose:()=>void;onSaved:()=>Promise<void>}){
  const today=todayKey();
  const [name,setName]=useState(staff?.name||"");const [joinDate,setJoinDate]=useState(staff?.joinDate||today);const [endDate,setEndDate]=useState(staff?.endDate||"");const [salary,setSalary]=useState("");const [offDays,setOffDays]=useState(staff?.weeklyOffDays||[]);const [offPaid,setOffPaid]=useState(staff?.weeklyOffPaid??true);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function save(){if(name.trim().length<2)return setError("Enter the staff member’s name.");if(!/^\d{4}-\d{2}-\d{2}$/.test(joinDate))return setError("Enter a valid join date.");if(endDate&&endDate<joinDate)return setError("Leaving date must be on or after joining date.");const amount=Number(salary);if(!staff&&(!salary.trim()||!Number.isFinite(amount)||amount<0))return setError("Enter a valid monthly salary.");setBusy(true);setError("");try{if(staff)await api.updateStaff(staff._id,{name:name.trim(),joinDate,...(staff.isActive?{endDate:endDate||null}:{}),weeklyOffDays:offDays,weeklyOffPaid:offPaid});else await api.createStaff({name:name.trim(),joinDate,monthlySalary:amount,weeklyOffDays:offDays,weeklyOffPaid:offPaid});await onSaved();onClose();}catch(issue){setError(issue instanceof Error?issue.message:"Unable to save staff profile.");}finally{setBusy(false);}}
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView style={styles.modalShade} behavior={Platform.OS==="ios"?"padding":"height"}><View style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{staff?"Edit staff profile":"Add staff member"}</Text><Pressable accessibilityLabel="Close" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}><Field label="Name" value={name} onChangeText={setName} placeholder="Staff member name"/><DateField label="Joining date" value={joinDate} onChange={setJoinDate}/>{staff?.isActive?<DateField label="Leaving date (optional)" value={endDate} onChange={setEndDate} optional minimumDate={joinDate}/>:staff?null:<Field label="Monthly salary (₹)" value={salary} onChangeText={setSalary} keyboardType="decimal-pad" placeholder="0"/>}<Text style={styles.label}>Weekly off days</Text><View style={styles.statusChoices}>{week.map((label,index)=><SmallButton key={label} title={label} active={offDays.includes(index)} onPress={()=>setOffDays(current=>current.includes(index)?current.filter(day=>day!==index):[...current,index].sort())}/>)}</View><SmallButton title={offPaid?"Weekly offs paid ✓":"Weekly offs unpaid"} active={offPaid} onPress={()=>setOffPaid(value=>!value)}/><Text style={styles.helper}>Weekly-off policy changes take effect today. Use salary revisions to change pay from a future date.</Text>{error?<Message text={error}/>:null}<ActionButton title={busy?"Saving…":staff?"Save profile":"Save staff member"} disabled={busy} onPress={()=>void save()}/><ActionButton title="Cancel" secondary onPress={onClose}/></ScrollView></View></KeyboardAvoidingView></Modal>;
}

function SalaryEditor({staff,onClose,onSaved}:{staff:StaffMember;onClose:()=>void;onSaved:()=>Promise<void>}){
  const [amount,setAmount]=useState("");const [effectiveFrom,setEffectiveFrom]=useState(todayKey());const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function save(){if(!amount.trim()||!Number.isFinite(Number(amount))||Number(amount)<0)return setError("Enter a valid monthly salary.");if(!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)||effectiveFrom<todayKey())return setError("Effective date must be today or later.");setBusy(true);setError("");try{await api.addSalaryRevision(staff._id,{amount:Number(amount),effectiveFrom});await onSaved();onClose();}catch(issue){setError(issue instanceof Error?issue.message:"Unable to add salary revision.");}finally{setBusy(false);}}
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView style={styles.modalShade} behavior={Platform.OS==="ios"?"padding":"height"}><View style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Revise {staff.name}’s salary</Text><Pressable accessibilityLabel="Close" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View><View style={styles.form}><Field label="New monthly salary (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0"/><DateField label="Effective from" value={effectiveFrom} onChange={setEffectiveFrom} minimumDate={todayKey()}/>{error?<Message text={error}/>:null}<ActionButton title={busy?"Saving…":"Add salary revision"} disabled={busy} onPress={()=>void save()}/><ActionButton title="Cancel" secondary onPress={onClose}/></View></View></KeyboardAvoidingView></Modal>;
}
function Field({label,value,onChangeText,placeholder,keyboardType}:{label:string;value:string;onChangeText:(value:string)=>void;placeholder?:string;keyboardType?:"decimal-pad"}){return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} style={styles.input}/></View>;}
function SmallButton({title,onPress,active=false,disabled=false}:{title:string;onPress:()=>void;active?:boolean;disabled?:boolean}){const acronym=title==="PTO"||title==="LOP";return <Pressable disabled={disabled} onPress={onPress} style={[styles.smallButton,active&&styles.smallActive,disabled&&styles.disabled]}><Text style={[styles.smallText,acronym&&styles.acronym,active&&styles.smallTextActive]}>{title}</Text></Pressable>;}

const styles=StyleSheet.create({actions:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",minHeight:48},sectionCard:{gap:13},staffCard:{gap:5},sectionTitle:{fontSize:17,fontWeight:"800",color:palette.ink},date:{fontSize:13,fontWeight:"700",color:palette.text},add:{minHeight:42,justifyContent:"center",paddingHorizontal:12,borderRadius:10,backgroundColor:palette.greenSoft},addText:{color:palette.green,fontSize:13,fontWeight:"700"},memberHeader:{flexDirection:"row",justifyContent:"space-between",gap:10},copy:{flex:1,gap:4},name:{fontSize:16,fontWeight:"800",color:palette.ink},salary:{fontSize:12,fontWeight:"700",color:palette.green},sourceLine:{fontSize:11,color:palette.muted,lineHeight:16,marginTop:5},helper:{fontSize:12,lineHeight:18,color:palette.muted},profileActions:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:12},smallButton:{minHeight:38,justifyContent:"center",paddingHorizontal:10,borderRadius:9,borderWidth:1,borderColor:palette.line,backgroundColor:"white"},smallActive:{backgroundColor:palette.greenSoft,borderColor:"#c9dfcc"},smallText:{fontSize:11,fontWeight:"700",color:palette.text,textTransform:"capitalize"},acronym:{textTransform:"none"},smallTextActive:{color:palette.green},disabled:{opacity:.5},field:{gap:6},leaveForm:{gap:8},label:{fontSize:12,fontWeight:"700",color:palette.text},input:{minHeight:48,borderWidth:1,borderColor:palette.line,borderRadius:10,paddingHorizontal:12,fontSize:16,color:palette.text,backgroundColor:"white"},attendanceCard:{gap:10,paddingTop:12,marginTop:12,borderTopWidth:1,borderTopColor:palette.line},attendanceHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8},status:{fontSize:11,fontWeight:"800",textTransform:"capitalize"},statusAcronym:{textTransform:"none"},statusPresent:{color:palette.green},statusAbsent:{color:palette.red},statusPending:{color:palette.orange},statusChoices:{flexDirection:"row",flexWrap:"wrap",gap:7},reset:{alignSelf:"flex-start",minHeight:38,justifyContent:"center"},link:{fontSize:12,fontWeight:"700",color:palette.green},errorText:{fontSize:12,color:palette.red},holidayRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8,paddingVertical:8,borderTopWidth:1,borderTopColor:palette.line},removeText:{fontSize:12,fontWeight:"700",color:palette.red},salaryLine:{flexDirection:"row",justifyContent:"space-between",gap:8,paddingVertical:10,borderTopWidth:1,borderTopColor:palette.line},modalShade:{flex:1,justifyContent:"flex-end",backgroundColor:"#17271d77"},modal:{maxHeight:"92%",padding:20,paddingBottom:30,backgroundColor:"white",borderTopLeftRadius:20,borderTopRightRadius:20},modalHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:14},modalTitle:{fontSize:20,fontWeight:"800",color:palette.ink,flex:1},close:{width:38,height:38,borderRadius:10,alignItems:"center",justifyContent:"center",backgroundColor:palette.background},closeText:{fontSize:26,color:palette.muted},form:{gap:13,paddingBottom:8}}
);
