import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXTENSION_DOWNLOAD_PATH } from "@/lib/extension";

export function ExtensionDownloadButton({
  variant = "outline",
  size = "sm",
  className,
}: {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  return (
    <Button variant={variant} size={size} className={className} asChild>
      <a href={EXTENSION_DOWNLOAD_PATH} download>
        <Download className="size-4" />
        Download extension
      </a>
    </Button>
  );
}
