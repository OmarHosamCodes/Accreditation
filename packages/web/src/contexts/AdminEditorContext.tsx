import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type EditingState = {
  brandId: number;
  appId: number | null;
  rubric: number;
  weights: number;
  summary: string;
  auditId: number | null;
};

type ScoreState = Record<number, { score: number; note: string }>;

type AdminEditorContextValue = {
  editing: EditingState | null;
  scores: ScoreState;
  startAudit: (brandId: number, appId: number | null) => void;
  cancelEdit: () => void;
  setScore: (dimId: number, score: number) => void;
  setNote: (dimId: number, note: string) => void;
  setSummary: (summary: string) => void;
  setAuditId: (auditId: number) => void;
};

const AdminEditorContext = createContext<AdminEditorContextValue | null>(null);

export function AdminEditorProvider({ children, db }: { children: ReactNode; db: NonNullable<import("@accreditation/shared").AppState> }) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [scores, setScores] = useState<ScoreState>({});

  const startAudit = useCallback(
    (brandId: number, appId: number | null) => {
      const rubric = db.rubric_versions[db.rubric_versions.length - 1]!.id;
      const weights = db.weights_versions[db.weights_versions.length - 1]!.id;
      const initialScores: ScoreState = {};
      db.dimensions.forEach((d) => {
        initialScores[d.id] = { score: 5, note: "" };
      });
      setScores(initialScores);
      setEditing({ brandId, appId, rubric, weights, summary: "", auditId: null });
    },
    [db],
  );

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setScores({});
  }, []);

  const setScore = useCallback((dimId: number, score: number) => {
    setScores((s) => ({ ...s, [dimId]: { ...s[dimId]!, score } }));
  }, []);

  const setNote = useCallback((dimId: number, note: string) => {
    setScores((s) => ({ ...s, [dimId]: { ...s[dimId]!, note } }));
  }, []);

  const setSummary = useCallback((summary: string) => {
    setEditing((e) => (e ? { ...e, summary } : e));
  }, []);

  const setAuditId = useCallback((auditId: number) => {
    setEditing((e) => (e ? { ...e, auditId } : e));
  }, []);

  return (
    <AdminEditorContext.Provider value={{ editing, scores, startAudit, cancelEdit, setScore, setNote, setSummary, setAuditId }}>
      {children}
    </AdminEditorContext.Provider>
  );
}

export function useAdminEditor() {
  const ctx = useContext(AdminEditorContext);
  if (!ctx) throw new Error("useAdminEditor must be used within AdminEditorProvider");
  return ctx;
}
