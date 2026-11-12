import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth";
import { palette } from "@/lib/theme";

type Mode = "signin" | "signup" | "forgot";
export default function SignInScreen() {
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setError(""); setNotice("");
    if (!email.trim()) return setError("Enter your email address.");
    if (mode === "signup" && name.trim().length < 2) return setError("Enter your name.");
    if (mode !== "forgot" && password.length < 12) return setError("Password must be at least 12 characters.");
    setBusy(true);
    try {
      if (mode === "signin") await signIn(email, password);
      else if (mode === "signup") await signUp(name, email, password);
      else setNotice(await requestPasswordReset(email));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to continue. Try again."); }
    finally { setBusy(false); }
  }
  const title = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password";
  const subtitle = mode === "signin" ? "Sign in to manage your household ledger." : mode === "signup" ? "Create a secure account for your household." : "We’ll send a reset link if an account matches.";
  return <SafeAreaView style={styles.safe} edges={["top","bottom"]}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}><Text style={styles.brandLetter}>d</Text></View>
        <Text style={styles.brandCaption}>HOUSEHOLD MANAGEMENT</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {mode === "signup" && <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        {mode !== "forgot" && <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 12 characters" secureTextEntry autoComplete={mode === "signup" ? "new-password" : "current-password"} />}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => void submit()} disabled={busy} style={({pressed})=>[styles.primary,busy&&styles.disabled,pressed&&!busy&&styles.pressed]}>
          <Text style={styles.primaryText}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</Text>
        </Pressable>
        {mode === "signin" && <Pressable onPress={()=>{setMode("forgot");setError("");setNotice("");}} hitSlop={8}><Text style={styles.link}>Forgot password?</Text></Pressable>}
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>{mode === "signup" ? "Already have an account?" : mode === "forgot" ? "Remembered your password?" : "New to Daily Ledger?"}</Text>
          <Pressable onPress={()=>{setMode(mode === "signup" || mode === "forgot" ? "signin" : "signup");setError("");setNotice("");}} hitSlop={8}>
            <Text style={styles.link}>{mode === "signup" || mode === "forgot" ? "Sign in" : "Create account"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Field(props: React.ComponentProps<typeof TextInput> & {label:string}) {
  const {label,...inputProps}=props;
  return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput {...inputProps} style={styles.input} placeholderTextColor="#9aa39b" returnKeyType="next" />
  </View>;
}

const styles=StyleSheet.create({
  flex:{flex:1},safe:{flex:1,backgroundColor:palette.background},scroll:{flexGrow:1,justifyContent:"center",paddingHorizontal:24,paddingVertical:28,maxWidth:520,width:"100%",alignSelf:"center"},
  brandMark:{width:50,height:50,borderRadius:15,backgroundColor:"#173f2e",alignItems:"center",justifyContent:"center",marginBottom:16},brandLetter:{color:"white",fontSize:32,fontWeight:"800",lineHeight:38,marginRight:4},brandCaption:{fontSize:10,fontWeight:"800",letterSpacing:1.4,color:"#91a096",marginBottom:25},title:{fontSize:30,fontWeight:"800",letterSpacing:-0.8,color:palette.ink,marginBottom:8},subtitle:{fontSize:15,lineHeight:22,color:palette.muted,marginBottom:26},
  field:{gap:7,marginBottom:16},fieldLabel:{fontSize:14,fontWeight:"700",color:palette.text},input:{minHeight:52,borderWidth:1,borderColor:palette.line,borderRadius:11,paddingHorizontal:14,backgroundColor:"white",fontSize:16,color:palette.text},
  primary:{minHeight:52,backgroundColor:palette.green,borderRadius:12,alignItems:"center",justifyContent:"center",marginTop:6,shadowColor:"#173f2e",shadowOpacity:0.12,shadowRadius:9,shadowOffset:{width:0,height:4},elevation:2},primaryText:{fontSize:16,fontWeight:"700",color:"white"},disabled:{opacity:0.65},pressed:{transform:[{scale:0.99}]},
  error:{marginBottom:10,padding:11,borderRadius:9,backgroundColor:palette.redSoft,color:palette.red,fontSize:13,lineHeight:18},notice:{marginBottom:10,padding:11,borderRadius:9,backgroundColor:palette.greenSoft,color:palette.green,fontSize:13,lineHeight:18},link:{color:palette.green,fontSize:14,fontWeight:"700",textAlign:"center",paddingVertical:14},switchRow:{flexDirection:"row",justifyContent:"center",gap:5,alignItems:"center",flexWrap:"wrap",marginTop:9},switchText:{fontSize:13,color:palette.muted}
});
