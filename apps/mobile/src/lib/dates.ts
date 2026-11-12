export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}
export function monthBounds(month:string) {
  const [year,monthNumber]=month.split("-").map(Number);
  const lastDay=new Date(year,monthNumber,0).getDate();
  return {from:`${month}-01`,to:`${month}-${String(lastDay).padStart(2,"0")}`};
}
export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
export function shiftMonth(month:string,delta:number) {
  const [year,monthNumber]=month.split("-").map(Number);
  return monthKey(new Date(year,monthNumber-1+delta,1));
}
export function monthTitle(month:string) {
  const [year,monthNumber]=month.split("-").map(Number);
  return new Date(year,monthNumber-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"});
}
export function dateTitle(date:string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}
export function money(amount:number) {
  return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(amount);
}
