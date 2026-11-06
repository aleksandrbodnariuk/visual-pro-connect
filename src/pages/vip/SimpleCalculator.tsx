import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Op = "+" | "−" | "×" | "÷";

const apply = (a: number, b: number, op: Op): number => {
  switch (op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? NaN : a / b;
  }
};

const fmt = (n: number) =>
  !isFinite(n) ? "Помилка" : String(parseFloat(n.toPrecision(12))).replace(".", ",");

export default function SimpleCalculator() {
  const navigate = useNavigate();
  const [display, setDisplay] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);
  const [expr, setExpr] = useState("");

  const value = () => parseFloat(display.replace(",", ".")) || 0;

  const digit = (d: string) => {
    if (display === "Помилка" || fresh) {
      setDisplay(d === "," ? "0," : d);
      setFresh(false);
      return;
    }
    if (d === "," && display.includes(",")) return;
    if (display.replace(/[-,]/g, "").length >= 15) return;
    setDisplay(display === "0" && d !== "," ? d : display + d);
  };

  const chooseOp = (next: Op) => {
    const v = value();
    if (acc !== null && op && !fresh) {
      const r = apply(acc, v, op);
      setAcc(r);
      setDisplay(fmt(r));
      setExpr(`${fmt(r)} ${next}`);
    } else {
      setAcc(v);
      setExpr(`${fmt(v)} ${next}`);
    }
    setOp(next);
    setFresh(true);
  };

  const equals = () => {
    if (acc === null || !op) return;
    const v = value();
    const r = apply(acc, v, op);
    setExpr(`${fmt(acc)} ${op} ${fmt(v)} =`);
    setDisplay(fmt(r));
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const clear = () => { setDisplay("0"); setAcc(null); setOp(null); setFresh(true); setExpr(""); };
  const back = () => { if (fresh) return; setDisplay(display.length > 1 ? display.slice(0, -1) : "0"); };
  const sign = () => setDisplay(fmt(-value()));
  const percent = () => setDisplay(fmt(acc !== null ? (acc * value()) / 100 : value() / 100));

  const keys: { l: string; a: () => void; v?: "op" | "eq" | "fn" }[] = [
    { l: "C", a: clear, v: "fn" }, { l: "±", a: sign, v: "fn" }, { l: "%", a: percent, v: "fn" }, { l: "÷", a: () => chooseOp("÷"), v: "op" },
    { l: "7", a: () => digit("7") }, { l: "8", a: () => digit("8") }, { l: "9", a: () => digit("9") }, { l: "×", a: () => chooseOp("×"), v: "op" },
    { l: "4", a: () => digit("4") }, { l: "5", a: () => digit("5") }, { l: "6", a: () => digit("6") }, { l: "−", a: () => chooseOp("−"), v: "op" },
    { l: "1", a: () => digit("1") }, { l: "2", a: () => digit("2") }, { l: "3", a: () => digit("3") }, { l: "+", a: () => chooseOp("+"), v: "op" },
    { l: "⌫", a: back, v: "fn" }, { l: "0", a: () => digit("0") }, { l: ",", a: () => digit(",") }, { l: "=", a: equals, v: "eq" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-sm pb-24">
        <Button variant="ghost" className="mb-3" onClick={() => navigate("/vip/tools")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> VIP-інструменти
        </Button>
        <Card className="p-4 space-y-3">
          <div className="rounded-lg bg-muted p-4 text-right">
            <div className="text-sm text-muted-foreground h-5 truncate">{expr}</div>
            <div className="text-4xl font-semibold tabular-nums truncate" aria-live="polite">{display}</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {keys.map((k) => (
              <Button
                key={k.l}
                onClick={k.a}
                variant={k.v === "eq" || k.v === "op" ? "default" : k.v === "fn" ? "secondary" : "outline"}
                className="h-14 text-xl"
              >
                {k.l}
              </Button>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
