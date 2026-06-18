import type { AppState } from "@accreditation/shared";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAppData } from "@/contexts/AppDataContext";
import { setDB } from "@/lib/state";

type ApiError = { errors?: string[] };

export function useAdminMutation() {
  const { updateDB } = useAppData();
  const [pending, setPending] = useState(false);

  const mutate = useCallback(
    async <T extends { state?: AppState }>(
      fn: () => Promise<T>,
      opts?: { success?: string; error?: string },
    ): Promise<T | null> => {
      setPending(true);
      try {
        const result = await fn();
        if (result.state) {
          setDB(result.state);
          updateDB(result.state);
        }
        if (opts?.success) toast.success(opts.success);
        return result;
      } catch (e) {
        const err = e as ApiError;
        toast.error(opts?.error || err.errors?.join(" ") || "Request failed");
        return null;
      } finally {
        setPending(false);
      }
    },
    [updateDB],
  );

  return { mutate, pending };
}
