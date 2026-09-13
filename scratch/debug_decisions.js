const http = require("http");

async function req(path, body, cookie) {
  return new Promise((res) => {
    const r = http.request("http://localhost:3000" + path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    }, (resp) => {
      let d = "";
      resp.on("data", c => d += c);
      resp.on("end", () => res({ status: resp.statusCode, body: JSON.parse(d || "{}"), cookie: resp.headers["set-cookie"]?.[0]?.split(";")[0] }));
    });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

(async () => {
  const appL = await req("/api/login", { email: "entrepreneur@mahindra-auto.in", password: "Applicant@123#", role: "applicant" });
  const newApp = await req("/api/applications", { industryCategory: "Light Engineering", landSize: 1, waterUse: 10, electricity: 100 }, appL.cookie);
  const appId = newApp.body.id;
  console.log("App created:", appId);

  const mpcbL = await req("/api/login", { email: "mpcb.officer@udyog.gov.in", password: "Mpcb@123#", role: "official" });
  const mpcb = await req(`/api/applications/${appId}/stage-decision`, { decision: "Approved" }, mpcbL.cookie);
  console.log("MPCB:", mpcb.status, mpcb.body);

  const midcL = await req("/api/login", { email: "midc.officer@udyog.gov.in", password: "Midc@123#", role: "official" });
  const midc = await req(`/api/applications/${appId}/stage-decision`, { decision: "Approved" }, midcL.cookie);
  console.log("MIDC:", midc.status, midc.body);

  const dishL = await req("/api/login", { email: "dish.officer@udyog.gov.in", password: "Dish@123#", role: "official" });
  const dish = await req(`/api/applications/${appId}/stage-decision`, { decision: "Approved" }, dishL.cookie);
  console.log("DISH:", dish.status, dish.body);

  const fireL = await req("/api/login", { email: "fire.officer@udyog.gov.in", password: "Fire@123#", role: "official" });
  const fire = await req(`/api/applications/${appId}/stage-decision`, { decision: "Approved" }, fireL.cookie);
  console.log("FIRE:", fire.status, fire.body);
})();

