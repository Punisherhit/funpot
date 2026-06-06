import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/merchandise")({
  component: MerchPage,
});

function MerchPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", price: 0, quantity: 0 });

  const { data } = useQuery({
    queryKey: ["merch"],
    queryFn: async () => (await supabase.from("merchandise").select("*").order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("merchandise").insert({ ...form, sku: form.sku || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Product added"); qc.invalidateQueries({ queryKey: ["merch"] }); setOpen(false); setForm({ name: "", sku: "", price: 0, quantity: 0 }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Merchandise</h1>
          <p className="text-muted-foreground">Inventory: t-shirts, jerseys, skates, helmets</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add product</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Price (KES)</Label><Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
                  <div><Label>Quantity</Label><Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={!form.name || create.isPending}>Add</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).length === 0 && <Card className="p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">No products yet.</Card>}
        {(data ?? []).map((p) => {
          const remaining = p.quantity - p.quantity_sold;
          return (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.sku && <div className="text-xs font-mono text-muted-foreground">SKU: {p.sku}</div>}
                </div>
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-3 text-2xl font-bold">KES {Number(p.price).toLocaleString()}</div>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="rounded-full bg-secondary px-2.5 py-0.5">Stock: {p.quantity}</span>
                <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-success">Sold: {p.quantity_sold}</span>
                <span className={`rounded-full px-2.5 py-0.5 ${remaining < 5 ? "bg-warning/20 text-warning-foreground" : "bg-primary/10 text-primary"}`}>Left: {remaining}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
