import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { StatCard } from "../../components/Card";
import { publicRegByDistrict } from "../../data/dummyData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users2, TrendingUp } from "lucide-react";

export default function PublicRegistrations() {
  const { t } = useLanguage();
  const total = publicRegByDistrict.reduce((s, d) => s + d.count, 0);

  return (
    <>
      <Topbar title={t("ptAdminPublicRegTitle")} subtitle={t("ptAdminPublicRegSub")} />
      <main className="p-4 sm:p-8 space-y-6" dir="ltr">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Registered" value={total} icon={Users2} delta="Across 5 districts" deltaTone="ok" />
          <StatCard label="Top District" value="Peshawar" icon={TrendingUp} delta="148 users" deltaTone="ok" />
          <StatCard label="Growth (30d)" value="+18%" icon={TrendingUp} delta="Awareness campaign impact" deltaTone="ok" />
        </div>

        <Card>
          <p className="font-display font-semibold mb-4">Registrations by District</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={publicRegByDistrict}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE1D3" vertical={false} />
              <XAxis dataKey="district" tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE1D3", fontSize: 12 }} />
              <Bar dataKey="count" fill="#3F8C2C" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </main>
    </>
  );
}
