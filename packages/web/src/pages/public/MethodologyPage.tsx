import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/contexts/AppDataContext";
import { activeWeights } from "@/lib/state";

export function MethodologyPage() {
  const { db } = useAppData();
  if (!db) return null;

  const av = db.rubric_anchors[1]!;
  const weights = activeWeights(db, db.weights_versions[db.weights_versions.length - 1]!.id);

  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="mb-2 text-3xl font-semibold">How the score is built</h1>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          Every brand is scored on 16 dimensions, each 1 to 10, against the published anchors below. Dimensions roll up into four weighted categories, then into a single 0 to 100 score and a tier. Each audit records the rubric version it used, so older audits stay reproducible.
        </p>
        {db.categories.map((c) => {
          const dims = db.dimensions.filter((d) => d.category_key === c.key);
          return (
            <div key={c.key} className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                {c.name}
                <Badge variant="secondary">{weights[c.key]}% of final</Badge>
              </h2>
              <Accordion type="multiple" className="w-full">
                {dims.map((d) => {
                  const a = av[d.id]!;
                  return (
                    <AccordionItem key={d.id} value={String(d.id)}>
                      <AccordionTrigger>
                        <span>
                          {d.name}{" "}
                          <span className="text-muted-foreground font-normal">({d.description})</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 text-sm">
                          <div><strong>Score 1:</strong> {a.anchor_1}</div>
                          <div><strong>Score 5:</strong> {a.anchor_5}</div>
                          <div><strong>Score 10:</strong> {a.anchor_10}</div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          );
        })}
      </div>
    </section>
  );
}
