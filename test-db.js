
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: buildings } = await supabase.from("buildings").select("*").limit(1);
  if (!buildings || buildings.length === 0) {
    console.log("No buildings found");
    return;
  }
  const b = buildings[0];
  console.log("Building:", b.id, b.name);
  
  const { data: h } = await supabase.from("hazard_indicators").select("*").eq("building_id", b.id);
  console.log("Hazard count:", h ? h.length : 0);
  
  const { data: v } = await supabase.from("vulnerability_indicators").select("*").eq("building_id", b.id);
  console.log("Vuln count:", v ? v.length : 0);
  
  const { data: e } = await supabase.from("exposure_indicators").select("*").eq("building_id", b.id);
  console.log("Exp count:", e ? e.length : 0);
}
run();

