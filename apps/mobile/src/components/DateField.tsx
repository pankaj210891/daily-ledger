import { useState } from "react";
import { Platform,Pressable,StyleSheet,Text,TextInput,View } from "react-native";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { palette } from "@/lib/theme";
import { dateTitle } from "@/lib/dates";

function parseDate(value:string){
  const [year,month,day]=value.split("-").map(Number);
  return /^\d{4}-\d{2}-\d{2}$/.test(value)&&year&&month&&day?new Date(year,month-1,day,12):new Date();
}
function toDateKey(value:Date){return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;}
export function DateField({label,value,onChange,placeholder="Choose date",minimumDate,maximumDate,optional=false}:{label:string;value:string;onChange:(value:string)=>void;placeholder?:string;minimumDate?:string;maximumDate?:string;optional?:boolean}){
  const [open,setOpen]=useState(false);
  const chosenDate=value?parseDate(value):new Date();
  const min=minimumDate?parseDate(minimumDate):undefined;
  const max=maximumDate?parseDate(maximumDate):undefined;
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    {Platform.OS==="web"?<TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" style={styles.input}/>:<>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value?dateTitle(value):placeholder}`} onPress={()=>setOpen(current=>!current)} style={styles.inputButton}><Text style={[styles.dateText,!value&&styles.placeholder]}>{value?dateTitle(value):placeholder}</Text><Text style={styles.calendarIcon}>▦</Text></Pressable>
      {optional&&value?<Pressable accessibilityRole="button" onPress={()=>onChange("")} style={styles.clear}><Text style={styles.clearText}>Clear date</Text></Pressable>:null}
      {open?<View style={styles.pickerWrap}><DateTimePicker value={chosenDate} mode="date" display={Platform.OS==="ios"?"compact":"default"} presentation="dialog" minimumDate={min} maximumDate={max} accentColor={palette.green} onValueChange={(_,nextDate)=>{onChange(toDateKey(nextDate));if(Platform.OS!=="ios")setOpen(false);}} onDismiss={()=>setOpen(false)}/>{Platform.OS==="ios"?<Pressable accessibilityRole="button" onPress={()=>setOpen(false)} style={styles.done}><Text style={styles.doneText}>Done</Text></Pressable>:null}</View>:null}
    </>}
  </View>;
}

const styles=StyleSheet.create({field:{gap:6},label:{fontSize:12,fontWeight:"700",color:palette.text},input:{minHeight:48,borderWidth:1,borderColor:palette.line,borderRadius:10,paddingHorizontal:12,fontSize:16,color:palette.text,backgroundColor:"white"},inputButton:{minHeight:48,borderWidth:1,borderColor:palette.line,borderRadius:10,paddingHorizontal:12,flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:"white"},dateText:{fontSize:15,color:palette.text},placeholder:{color:palette.muted},calendarIcon:{fontSize:18,color:palette.green},pickerWrap:{alignItems:"flex-end",padding:10,borderRadius:12,backgroundColor:palette.background},done:{minHeight:36,justifyContent:"center",paddingHorizontal:12},doneText:{fontSize:13,fontWeight:"700",color:palette.green},clear:{alignSelf:"flex-end",minHeight:30,justifyContent:"center",paddingHorizontal:2},clearText:{fontSize:11,fontWeight:"700",color:palette.red}});
