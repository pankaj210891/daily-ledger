import { useCallback,useEffect,useState } from "react";
import { router } from "expo-router";
import { Pressable,StyleSheet,Text,View } from "react-native";
import { api,type SalaryCalculation } from "@/lib/api";
import { dateTitle,monthKey,monthTitle,money } from "@/lib/dates";
import { palette } from "@/lib/theme";
import { Busy,Card,Message,MonthPicker,PageHeading,Screen } from "@/components/ui";

export default function SalaryScreen() {
  const [month,setMonth]=useState(monthKey());
  const [rows,setRows]=useState<SalaryCalculation[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [expanded,setExpanded]=useState<string[]>([]);
  const load=useCallback(async()=>{try{setRows(await api.salaries(month));}catch(reason){setError(reason instanceof Error?reason.message:"Unable to calculate salary.");}finally{setLoading(false);}},[month]);
  // The loader only commits state after its async API request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void load();},[load]);
  const totals=rows.reduce((sum,row)=>({gross:sum.gross+row.grossSalary,deductions:sum.deductions+row.deductions,net:sum.net+row.netPayable}),{gross:0,deductions:0,net:0});
  return <Screen>
    <Text onPress={()=>router.back()} style={styles.back}>‹  More</Text>
    <PageHeading eyebrow="FINANCES" title="Salary management" subtitle="Live estimates based on attendance, leave, holidays, and staff dates."/>
    <MonthPicker month={month} onChange={(value)=>{setLoading(true);setError("");setMonth(value);}}/>
    {error?<Message text={error}/>:null}
    {loading?<Busy label="Calculating salaries…"/>:<>
      <Card><Text style={styles.label}>TOTAL ESTIMATED PAYABLE · {monthTitle(month)}</Text><Text style={styles.total}>{money(totals.net)}</Text><View style={styles.breakdown}><Text style={styles.helper}>Gross {money(totals.gross)}</Text><Text style={styles.deduction}>Deductions −{money(totals.deductions)}</Text></View><Text style={styles.helper}>Unmarked past dates count as present. Future dates remain pending and are not deducted.</Text></Card>
      {rows.length?rows.map(row=><Card key={row.staffId}>
        <View style={styles.head}><View style={styles.copy}><Text style={styles.name}>{row.staffName}</Text><Text style={styles.helper}>Present {row.counts.present} · absent {row.counts.absent} · PTO {row.counts.pto} · LOP {row.counts.lop}</Text><Text style={styles.helper}>Weekly off {row.counts.weeklyOff} · holidays {row.counts.holiday}</Text></View><Text style={styles.amount}>{money(row.netPayable)}</Text></View>
        <View style={styles.breakdown}><Text style={styles.helper}>Gross {money(row.grossSalary)}</Text><Text style={styles.deduction}>− {money(row.deductions)}</Text></View>
        <Text style={styles.helper}>{row.counts.pendingAttendance} future attendance days pending</Text>
        <Pressable accessibilityRole="button" accessibilityState={{expanded:expanded.includes(row.staffId)}} onPress={()=>setExpanded(current=>current.includes(row.staffId)?current.filter(id=>id!==row.staffId):[...current,row.staffId])} style={styles.expand}><Text style={styles.link}>{expanded.includes(row.staffId)?"Hide":"View"} daily breakdown</Text></Pressable>
        {expanded.includes(row.staffId)?<View style={styles.dailyList}>{row.dailyBreakdown.map(day=><View key={day.date} style={styles.dailyRow}><View style={styles.copy}><Text style={styles.dailyDate}>{dateTitle(day.date)} · {day.status.toLowerCase()==="pto"?"PTO":day.status.toLowerCase()==="lop"?"LOP":day.status.replace("_"," ")}</Text><Text style={styles.helper}>{day.source}{day.reason?` · ${day.reason}`:""}</Text></View><Text style={day.deduction?styles.deduction:styles.helper}>{day.deduction?"− "+money(day.deduction):"No deduction"}</Text></View>)}</View>:null}
      </Card>):<Card><Text style={styles.helper}>No salary statements for {monthTitle(month)}. Add a staff profile and salary to begin.</Text></Card>}
      <Pressable onPress={()=>router.push("/(tabs)/staff")} style={styles.attendanceLink}><Text style={styles.link}>Open attendance to make corrections →</Text></Pressable>
    </>}
  </Screen>;
}
const styles=StyleSheet.create({back:{minHeight:38,textAlignVertical:"center",color:palette.green,fontSize:14,fontWeight:"700"},label:{fontSize:10,fontWeight:"800",letterSpacing:.5,color:palette.muted},total:{fontSize:27,fontWeight:"800",color:palette.ink,marginTop:8},helper:{fontSize:11,lineHeight:16,color:palette.muted,marginTop:6},head:{flexDirection:"row",justifyContent:"space-between",gap:10},copy:{flex:1,gap:5},name:{fontSize:16,fontWeight:"800",color:palette.ink},amount:{fontSize:15,fontWeight:"800",color:palette.green},breakdown:{flexDirection:"row",justifyContent:"space-between",paddingVertical:8,marginTop:10,borderTopWidth:1,borderTopColor:palette.line},deduction:{fontSize:11,fontWeight:"700",color:palette.red},expand:{minHeight:42,justifyContent:"center",alignSelf:"flex-start"},link:{fontSize:12,fontWeight:"700",color:palette.green},dailyList:{gap:8,paddingTop:10,borderTopWidth:1,borderTopColor:palette.line},dailyRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8,paddingVertical:6},dailyDate:{fontSize:12,fontWeight:"700",color:palette.text,textTransform:"capitalize"},attendanceLink:{minHeight:44,justifyContent:"center",alignItems:"center"}});
