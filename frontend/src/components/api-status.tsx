"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ApiStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = () =>
      api
        .health()
        .then(() => mounted && setOnline(true))
        .catch(() => mounted && setOnline(false));
    check();
    const id = setInterval(check, 10000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          online === null && "bg-muted-foreground",
          online === true && "bg-emerald-400",
          online === false && "bg-red-500 animate-pulse"
        )}
      />
      {online === false ? "API hors ligne" : "API"}
    </span>
  );
}
